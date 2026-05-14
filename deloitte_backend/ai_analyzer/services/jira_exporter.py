import os
from jira import JIRA
from typing import List, Dict, Optional, Any

class JiraExporter:
    # FIX: Changed 'str' to 'Optional[str]' to satisfy Pylance
    def __init__(self, url: Optional[str] = None, email: Optional[str] = None, token: Optional[str] = None, project_key: Optional[str] = None):
        """
        Initializes Jira connection. 
        Prioritizes arguments passed (Dynamic Auth) over Environment Variables (Static Auth).
        """
        self.jira_url = url or os.environ.get("JIRA_URL") or os.environ.get("JIRA_SERVER")
        self.jira_email = email or os.environ.get("JIRA_EMAIL")
        self.jira_token = token or os.environ.get("JIRA_API_TOKEN")
        self.project_key = project_key or os.environ.get("JIRA_PROJECT_KEY", "KAN")

        self.jira = None

        if not all([self.jira_url, self.jira_email, self.jira_token]):
            # Silent fallback if credentials aren't ready yet
            return

        try:
            self.jira = JIRA(
                server=self.jira_url,
                basic_auth=(str(self.jira_email), str(self.jira_token))
            )
            print(f"✅ Connected to Jira Instance: {self.jira_url}")
        except Exception as e:
            self.jira = None
            print(f"❌ Failed to connect to Jira: {e}")

    def verify_connection(self) -> Dict[str, Any]:
        if not self.jira:
            return {"connected": False, "error": "Jira not initialized"}
        try:
            user = self.jira.myself()
            return {
                "connected": True,
                "user": user.get("displayName"),
                "email": user.get("emailAddress"),
                "url": self.jira_url,
            }
        except Exception as e:
            return {"connected": False, "error": str(e)}

    def create_test_cases(self, test_cases: List[Dict], project_summary: Optional[str] = None) -> Dict:
        if not self.jira:
            return {"success": False, "error": "Jira connection unavailable. Check credentials."}

        print(f"\n📤 Exporting {len(test_cases)} test cases to Jira project: {self.project_key}")
        created_issues = []
        failed_issues = []

        parent_key = None
        if project_summary:
            try:
                parent = self.jira.create_issue(
                    project=self.project_key,
                    summary=f"🚀 AI Test Suite: {project_summary[:50]}...",
                    description=f"Generated analysis.\nTotal Tests: {len(test_cases)}",
                    issuetype={'name': 'Task'}
                )
                parent_key = parent.key
            except Exception as e:
                print(f"Warning: Could not create parent task: {e}")

        for tc in test_cases:
            try:
                complexity = tc.get('complexity', 'Medium')
                issue_data = {
                    'project': self.project_key,
                    'summary': f"[{complexity}] Test: {tc.get('test_case_name', 'Unnamed Scenario')}",
                    'description': self._format_test_description(tc),
                    'issuetype': {'name': 'Task'},
                    'priority': {'name': self._map_priority(tc.get('priority', 'Medium'))}
                }
                
                new_issue = self.jira.create_issue(fields=issue_data)
                
                if parent_key:
                    try:
                        self.jira.create_issue_link(
                            type="Relates", inwardIssue=parent_key, outwardIssue=new_issue.key
                        )
                    except: pass 

                created_issues.append({"key": new_issue.key, "summary": tc.get('test_case_name')})
            except Exception as e:
                failed_issues.append({"test": tc.get('test_case_name'), "error": str(e)})

        return {
            "success": True, 
            "created_count": len(created_issues), 
            "created_issues": created_issues, 
            "failed_issues": failed_issues
        }

    def _format_test_description(self, tc: Dict) -> str:
        return (
            f"*AI-Generated Test Scenario*\n"
            f"*Complexity:* {tc.get('complexity', 'Medium')}\n"
            f"*Gap Analysis:* {tc.get('gap_analysis', 'N/A')}\n\n"
            f"*Description:* {tc.get('description', 'N/A')}\n"
            f"*Steps:* {tc.get('steps', 'N/A')}\n\n"
            f"*Automation Code:*\n{{code:python}}\n{tc.get('code', '# No code')}\n{{code}}"
        )

    def _map_priority(self, priority: str) -> str:
        mapping = {"Critical": "Highest", "High": "High", "Medium": "Medium", "Low": "Low"}
        return mapping.get(priority, "Medium")