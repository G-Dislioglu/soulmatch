/**
 * Maya UI Command Parser
 *
 * Extracts structured <<<{json}>>> command blocks from LLM response text.
 * Commands are validated against a whitelist before being returned.
 */

export const VALID_COMMANDS = [
  'navigate',
  'highlight',
  'expand',
  'suggest',
  'persona_switch',
  'scroll_to',
  'truth_mode',
  'tour_start',
] as const;

export type MayaCommandType = (typeof VALID_COMMANDS)[number];

export interface TourStep {
  target: string;
  text: string;
  duration?: number;
}

export interface MayaCommand {
  cmd: MayaCommandType;
  target?: string;
  confirm?: string;
  /** suggest-specific */
  text?: string;
  action?: MayaCommand;
  /** tour_start-specific */
  steps?: TourStep[];
  /** Internal: set after user confirms */
  _confirmed?: boolean;
}

export interface ParsedResponse {
  text: string;
  commands: MayaCommand[];
}

const CMD_REGEX = /<<<(\{.*?\})>>>/gs;

export function parseResponse(raw: string): ParsedResponse {
  const commands: MayaCommand[] = [];
  let text = raw;

  let match: RegExpExecArray | null;
  while ((match = CMD_REGEX.exec(raw)) !== null) {
    try {
      const parsed = JSON.parse(match[1]!) as Record<string, unknown>;
      if (
        typeof parsed.cmd === 'string' &&
        (VALID_COMMANDS as readonly string[]).includes(parsed.cmd)
      ) {
        commands.push(parsed as unknown as MayaCommand);
      }
    } catch {
      console.warn('[MayaCmd] Failed to parse command:', match[1]);
    }
    text = text.replace(match[0], '');
  }

  // Reset regex lastIndex (it's global)
  CMD_REGEX.lastIndex = 0;

  return { text: text.trim(), commands };
}
