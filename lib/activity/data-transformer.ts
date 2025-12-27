/**
 * Transform raw message data into activity chart format
 * Converts the messages array into daily aggregated data
 */

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  model: string | null;
  created_at: string;
  input_tokens: number | null;
  output_tokens: number | null;
  total_tokens: number | null;
  completion_time: number | null;
  conversation_id: string;
}

export interface ActivityData {
  date: string;
  messages: number;
  conversations: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  // Model specific data will be added dynamically
  [key: string]: number | string;
}

/**
 * Parse and aggregate messages by date
 */
export function transformMessageData(messages: Message[]): ActivityData[] {
  // Group messages by date
  const dailyData = new Map<string, {
    messages: number;
    conversations: Set<string>;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    models: Map<string, number>;
  }>();

  messages.forEach((msg) => {
    if (msg.role !== 'assistant') return; // Only count assistant messages

    const date = new Date(msg.created_at);
    const dateKey = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    if (!dailyData.has(dateKey)) {
      dailyData.set(dateKey, {
        messages: 0,
        conversations: new Set(),
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        models: new Map(),
      });
    }

    const day = dailyData.get(dateKey)!;
    day.messages++;
    day.conversations.add(msg.conversation_id);
    day.inputTokens += msg.input_tokens || 0;
    day.outputTokens += msg.output_tokens || 0;
    day.totalTokens += msg.total_tokens || 0;

    // Track by model
    if (msg.model) {
      const modelName = msg.model.replace('openai/', '');
      day.models.set(modelName, (day.models.get(modelName) || 0) + 1);
    }
  });

  // Convert map to array and sort by date
  const sortedData = Array.from(dailyData.entries())
    .map(([date, data]) => ({
      date,
      messages: data.messages,
      conversations: data.conversations.size,
      inputTokens: data.inputTokens,
      outputTokens: data.outputTokens,
      totalTokens: data.totalTokens,
      ...Object.fromEntries(data.models),
    }))
    .sort((a, b) => {
      const dateA = new Date(a.date + ', 2024');
      const dateB = new Date(b.date + ', 2024');
      return dateA.getTime() - dateB.getTime();
    });

  return sortedData;
}

/**
 * Get all unique models from messages
 */
export function getUniqueModels(messages: Message[]): string[] {
  const models = new Set<string>();
  messages.forEach((msg) => {
    if (msg.model) {
      models.add(msg.model.replace('openai/', ''));
    }
  });
  return Array.from(models).sort();
}

/**
 * Sample data parser - paste your exported JSON data here
 */
export function parseExportedData(jsonData: any): ActivityData[] {
  try {
    // Parse the nested structure
    const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;

    // Handle different export formats
    const messages = data.messages || data[0]?.messages || [];

    return transformMessageData(messages);
  } catch (error) {
    console.error('Error parsing exported data:', error);
    return [];
  }
}
