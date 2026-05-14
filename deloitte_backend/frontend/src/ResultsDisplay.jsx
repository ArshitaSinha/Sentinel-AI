import React from 'react';

const ResultsDisplay = ({ type, data }) => {
  
  const downloadCSV = () => {
    if (!data || data.length === 0) return;
    const headers = ["Test case name", "Description", "Steps", "Status", "Date", "POC"];
    const keys = ["test_case_name", "description", "steps", "status", "date", "poc"];

    const csvRows = [
      headers.join(','),
      ...data.map(row => 
        keys.map(key => {
          let val = row[key] || "";
          val = typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val;
          return val;
        }).join(',')
      )
    ];

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'test_cases.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (type === 'summary') {
    return (
      <div className="card result-card">
        <div className="summary-header">
          <span className="badge">Project Analysis</span>
          <h1>{data.project_purpose}</h1>
        </div>
        <p className="summary-text">{data.project_summary}</p>
        
        <div className="grid-layout">
          <div className="info-block">
            <h3>Tech Stack</h3>
            <div className="tags">
              {data.tech_stack.map((tech, i) => <span key={i} className="tag">{tech}</span>)}
            </div>
            
            <h3>External Libs</h3>
            <ul className="simple-list">
              {data.external_dependencies.map((dep, i) => <li key={i}>{dep}</li>)}
            </ul>
          </div>

          <div className="info-block">
            <h3>Internal Flow</h3>
            {data.internal_dependencies.length > 0 ? (
              <ul className="flow-list">
                {data.internal_dependencies.map((dep, i) => (
                  <li key={i}>
                    <div className="flow-arrow">
                      <span>{dep.from_file}</span>
                      <span className="arrow">➝</span>
                      <span>{dep.to_file}</span>
                    </div>
                    <div className="flow-desc">{dep.description}</div>
                  </li>
                ))}
              </ul>
            ) : <p className="text-muted">No internal dependencies found.</p>}
          </div>
        </div>
      </div>
    );
  }

  if (type === 'testcases') {
    return (
      <div className="card result-card full-width">
        <div className="card-header">
          <h2>Test Cases</h2>
          <button className="btn btn-download" onClick={downloadCSV}>Download CSV</button>
        </div>
        <div className="table-wrapper">
          <table className="modern-table">
            <thead>
              <tr>
                <th style={{width: '5%'}}>#</th>
                <th style={{width: '20%'}}>Test Case</th>
                <th style={{width: '25%'}}>Description</th>
                <th style={{width: '30%'}}>Steps</th>
                <th>Status</th>
                <th>Date</th>
                <th>POC</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item, index) => (
                <tr key={index}>
                  <td>{index + 1}</td>
                  <td className="fw-bold">{item.test_case_name}</td>
                  <td>{item.description}</td>
                  <td className="pre-wrap">{item.steps}</td>
                  <td>{item.status}</td>
                  <td>{item.date}</td>
                  <td>{item.poc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return null;
};

export default ResultsDisplay;