// Mock for CSS files
export default 'mocked css content';

// Mock for CSS module imports
export const mockCSS = `
  /* Mock CSS content */
  body {
    font-family: Arial, sans-serif;
    line-height: 1.6;
    color: #333;
    margin: 0;
    padding: 0;
  }
  
  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
  }
  
  .button {
    background-color: #007bff;
    color: white;
    padding: 10px 20px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  
  .button:hover {
    background-color: #0056b3;
  }
  
  @media (max-width: 768px) {
    .container {
      padding: 10px;
    }
    
    .button {
      width: 100%;
      display: block;
    }
  }
`;