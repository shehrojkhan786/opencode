export class LLMProvider {
  constructor(config) {
    this.config = config;
  }

  async chatCompletion(messages, tools = [], stream = false) {
    const provider = (this.config.provider || "openai").toLowerCase();
    const isLocalProvider = provider === "ollama" || provider === "vllm";

    if (!isLocalProvider && !this.config.apiKey) {
      throw new Error(`Missing API Key for ${provider}. Set API key using "opencode config --key <key>".`);
    }

    if (provider === "anthropic" && !this.config.baseUrl.includes("/v1/chat/completions")) {
      return this.anthropicCompletion(messages, tools);
    }

    // OpenAI, Ollama, vLLM, and Custom OpenAI-compatible endpoints
    const payload = {
      model: this.config.model || "gpt-4o",
      messages,
      temperature: 0.2
    };

    if (tools.length > 0) {
      payload.tools = tools.map(t => ({ type: "function", function: t }));
    }

    const endpoint = this.config.baseUrl.endsWith("/chat/completions")
      ? this.config.baseUrl
      : `${this.config.baseUrl.replace(/\/+$/, "")}/chat/completions`;

    const headers = { "Content-Type": "application/json" };
    if (this.config.apiKey) {
      headers["Authorization"] = `Bearer ${this.config.apiKey}`;
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Provider (${provider}) API Error ${response.status}: ${errText}`);
    }

    const data = await response.json();
    return data.choices[0].message;
  }

  async anthropicCompletion(messages, tools = []) {
    const systemMsg = messages.find(m => m.role === "system")?.content || "";
    const filteredMsgs = messages.filter(m => m.role !== "system");

    const payload = {
      model: this.config.model || "claude-3-5-sonnet-20241022",
      max_tokens: 4096,
      system: systemMsg,
      messages: filteredMsgs.map(m => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content || ""
      }))
    };

    if (tools.length > 0) {
      payload.tools = tools.map(t => ({
        name: t.name,
        description: t.description,
        input_schema: t.parameters
      }));
    }

    const endpoint = this.config.baseUrl.endsWith("/messages")
      ? this.config.baseUrl
      : `${this.config.baseUrl.replace(/\/+$/, "")}/messages`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.config.apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Anthropic API Error ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const textContent = data.content.find(c => c.type === "text")?.text || "";
    const toolCalls = data.content
      .filter(c => c.type === "tool_use")
      .map(t => ({
        id: t.id,
        type: "function",
        function: { name: t.name, arguments: JSON.stringify(t.input) }
      }));

    return {
      role: "assistant",
      content: textContent,
      tool_calls: toolCalls.length ? toolCalls : null
    };
  }
}