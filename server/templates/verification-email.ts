
export const getVerificationEmailTemplate = (verificationCode: string) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { 
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 0;
      background: #14151A;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background: #1A1B21;
      border: 1px solid #2A2B31;
      border-radius: 10px;
    }
    .header {
      text-align: center;
      padding: 20px 0;
    }
    .header img {
      width: 150px;
    }
    .content {
      color: #ffffff;
      padding: 20px;
      text-align: center;
    }
    .code {
      background: #D7FF00;
      color: #14151A;
      padding: 15px 30px;
      font-size: 24px;
      font-weight: bold;
      border-radius: 5px;
      margin: 20px 0;
      display: inline-block;
    }
    .footer {
      text-align: center;
      color: #8A8B91;
      font-size: 12px;
      padding-top: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://goatedvips.gg/images/logo-neon.png" alt="GoatedVIPs" />
    </div>
    <div class="content">
      <h2>Verify Your Email</h2>
      <p>Welcome to GoatedVIPs! Please use the following code to verify your email address:</p>
      <div class="code">${verificationCode}</div>
      <p>This code will expire in 30 minutes.</p>
    </div>
    <div class="footer">
      <p>© 2024 GoatedVIPs. All rights reserved.</p>
      <p>This is an automated message, please do not reply.</p>
    </div>
  </div>
</body>
</html>
`;
