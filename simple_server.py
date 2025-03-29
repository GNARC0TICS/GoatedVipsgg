from http.server import BaseHTTPRequestHandler, HTTPServer

class SimpleHTTPRequestHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'text/html')
        self.end_headers()
        
        html_content = """
        <!DOCTYPE html>
        <html>
        <head>
            <title>GoatedVIPs Server</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 20px;
                }
                h1 {
                    color: #f0ad4e;
                }
                .card {
                    border: 1px solid #ddd;
                    border-radius: 8px;
                    padding: 20px;
                    margin-bottom: 20px;
                    background-color: #f9f9f9;
                }
            </style>
        </head>
        <body>
            <h1>GoatedVIPs Platform</h1>
            <div class="card">
                <h2>Server Status</h2>
                <p>✅ The server is running successfully!</p>
            </div>
            <div class="card">
                <h2>Platform Components</h2>
                <ul>
                    <li>React/TypeScript Frontend</li>
                    <li>Express.js Backend</li>
                    <li>PostgreSQL Database with Drizzle ORM</li>
                    <li>WebSocket for real-time communication</li>
                    <li>Telegram Bot Integration</li>
                </ul>
            </div>
        </body>
        </html>
        """
        
        self.wfile.write(html_content.encode('utf-8'))

def run_server(port=8080):
    server_address = ('0.0.0.0', port)
    httpd = HTTPServer(server_address, SimpleHTTPRequestHandler)
    print(f"Server running on port {port}")
    httpd.serve_forever()

if __name__ == "__main__":
    import os
    port = int(os.environ.get('PORT', 8080))
    run_server(port)
