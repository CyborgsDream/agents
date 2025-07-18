# Project Plan: AI Persona Dashboard

This project aims to build a dashboard similar in spirit to WordPress where users can manage AI models and persona settings through a rich yet minimal interface. The key ideas are:

1. **Dashboard Front Page**
   - WordPress-style layout with a sidebar for navigation and a main area for content.
   - Responsive HTML5 interface that works locally or via the web.

2. **Manage APIs / AI Models**
   - Users can add, edit or remove API keys and choose which AI model to use.
   - Support for multiple providers (e.g. OpenAI, Groq, OpenRouter).

3. **Manage Personas**
   - Each persona is defined by a JSON-like description with a name and system prompt.
   - Users can create, edit or delete personas from the dashboard.

4. **Collaborative Responses**
   - A prompt from the user triggers a conversation where multiple personas respond and can exchange information.
   - The system coordinates the calls to the configured AI APIs in real time.

5. **HTML5 Prototype**
   - Initial prototype uses basic CSS for layout and vector icons for a clean look.
   - JavaScript handles persona management, API calls and real-time updates.

This repository currently contains a sample dashboard (see `index.html`). `prototype.html` below shows a trimmed-down skeleton to start building upon.
