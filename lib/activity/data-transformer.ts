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
    modelMetrics: Map<string, number>; // For messages and tokens
    modelConversations: Map<string, Set<string>>; // For conversations per model
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
        modelMetrics: new Map(),
        modelConversations: new Map(),
      });
    }

    const day = dailyData.get(dateKey)!;
    day.messages++;
    day.conversations.add(msg.conversation_id);
    day.inputTokens += msg.input_tokens || 0;
    day.outputTokens += msg.output_tokens || 0;
    day.totalTokens += msg.total_tokens || 0;

    // Track by model with flat keys for messages and tokens
    if (msg.model) {
      const modelName = msg.model.replace('openai/', '');
      const messageKey = `${modelName}-messages`;
      const inputKey = `${modelName}-inputTokens`;
      const outputKey = `${modelName}-outputTokens`;
      const totalKey = `${modelName}-totalTokens`;
      const convoKey = `${modelName}-conversations`;

      // Track messages and tokens
      day.modelMetrics.set(messageKey, (day.modelMetrics.get(messageKey) || 0) + 1);
      day.modelMetrics.set(inputKey, (day.modelMetrics.get(inputKey) || 0) + (msg.input_tokens || 0));
      day.modelMetrics.set(outputKey, (day.modelMetrics.get(outputKey) || 0) + (msg.output_tokens || 0));
      day.modelMetrics.set(totalKey, (day.modelMetrics.get(totalKey) || 0) + (msg.total_tokens || 0));

      // Track conversations per model
      if (!day.modelConversations.has(convoKey)) {
        day.modelConversations.set(convoKey, new Set());
      }
      day.modelConversations.get(convoKey)!.add(msg.conversation_id);
    }
  });

  // Convert map to array and sort by date
  const sortedData = Array.from(dailyData.entries())
    .map(([date, data]) => {
      // Convert model conversations Set to count
      const modelConversions: Record<string, number> = {};
      data.modelConversations.forEach((convos, key) => {
        modelConversions[key] = convos.size;
      });

      return {
        date,
        messages: data.messages,
        conversations: data.conversations.size,
        inputTokens: data.inputTokens,
        outputTokens: data.outputTokens,
        totalTokens: data.totalTokens,
        ...Object.fromEntries(data.modelMetrics),
        ...modelConversions,
      };
    })
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
