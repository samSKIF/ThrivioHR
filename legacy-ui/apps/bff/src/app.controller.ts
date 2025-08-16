import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';

@Controller()
export class AppController {
  @Get()
  getApiDocumentation(@Res() res: Response) {
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>ThrivioHR BFF API</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; }
        .endpoint { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 5px; }
        .method { display: inline-block; padding: 4px 8px; border-radius: 3px; color: white; font-weight: bold; }
        .get { background: #4CAF50; }
        .post { background: #2196F3; }
        code { background: #f0f0f0; padding: 2px 4px; border-radius: 3px; }
        h1 { color: #333; }
        h2 { color: #666; border-bottom: 2px solid #eee; padding-bottom: 10px; }
    </style>
</head>
<body>
    <h1>🚀 ThrivioHR BFF API</h1>
    <p>Backend-for-Frontend API for the AI-first employee engagement platform</p>
    
    <h2>Available Endpoints</h2>
    
    <div class="endpoint">
        <span class="method get">GET</span> <code>/health</code>
        <p>Health check endpoint - returns {"ok": true}</p>
    </div>
    
    <div class="endpoint">
        <span class="method get">GET</span> <code>/orgs?limit=N</code>
        <p>List organizations with optional pagination limit</p>
    </div>
    
    <div class="endpoint">
        <span class="method post">POST</span> <code>/orgs</code>
        <p>Create new organization<br>
        Body: <code>{"name": "Organization Name"}</code></p>
    </div>
    
    <div class="endpoint">
        <span class="method get">GET</span> <code>/users?orgId=UUID&limit=N</code>
        <p>List users for an organization with optional pagination limit</p>
    </div>
    
    <div class="endpoint">
        <span class="method post">POST</span> <code>/users</code>
        <p>Create new user<br>
        Body: <code>{"orgId": "UUID", "email": "user@example.com", "givenName": "First", "familyName": "Last"}</code></p>
    </div>
    
    <h2>Example Usage</h2>
    <pre>
# Health Check
curl http://localhost:5000/health

# Create Organization  
curl -X POST http://localhost:5000/orgs \\
  -H 'Content-Type: application/json' \\
  -d '{"name": "Acme Corp"}'

# List Organizations
curl http://localhost:5000/orgs?limit=10

# Create User
curl -X POST http://localhost:5000/users \\
  -H 'Content-Type: application/json' \\
  -d '{"orgId": "uuid-here", "email": "john@acme.com", "givenName": "John", "familyName": "Doe"}'
    </pre>
    
    <p><strong>Status:</strong> ✅ All endpoints operational | Database: PostgreSQL + Drizzle ORM</p>
</body>
</html>`;
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  }

  @Get('health')
  getHealth() {
    return { ok: true };
  }
}