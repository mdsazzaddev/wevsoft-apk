export class WevAIClient {
  private static getHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  static async chat(userMessage: string, pageContext: string, featureContext: string, conversationId?: string) {
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ userMessage, pageContext, featureContext, conversationId })
    });
    
    if (!response.ok) {
      throw new Error('AI is temporarily unavailable. Please try again.');
    }
    
    return response.json();
  }

  static async executeAction(toolName: string, args: any, isConfirmed: boolean = false) {
    const response = await fetch('/api/ai/action', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ toolName, args, isConfirmed })
    });
    
    if (!response.ok) {
      throw new Error('Failed to execute AI action.');
    }
    
    return response.json();
  }
}
