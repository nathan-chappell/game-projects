export interface DialogueLine {
  speaker: string;
  text: string;
  angry?: boolean;
}
export interface Dialogue {
  lines: DialogueLine[];
  index: number;
  shown: number;
  kind: string;
  npcId?: string;
}
