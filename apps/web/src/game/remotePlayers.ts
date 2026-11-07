import type { Facing, WorldSnapshotPayload } from '@stamp-tour/shared';

interface Sample {
  t: number;
  x: number;
  y: number;
  facing: Facing;
}

export interface RemotePlayerView {
  id: string;
  x: number;
  y: number;
  facing: Facing;
  moving: boolean;
}

const RENDER_DELAY_MS = 100;
const BUFFER_MS = 1_000;
const MOVING_WINDOW_MS = 200;
const SNAP_DISTANCE_PX = 200;
const CLOCK_SMOOTHING = 0.1;

function sampleAt(samples: Sample[], t: number): Sample {
  const first = samples[0]!;
  if (t <= first.t) return first;
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1]!;
    const b = samples[i]!;
    if (t > b.t) continue;
    if (Math.abs(b.x - a.x) > SNAP_DISTANCE_PX) return b;
    const ratio = (t - a.t) / (b.t - a.t);
    return { t, x: a.x + (b.x - a.x) * ratio, y: a.y + (b.y - a.y) * ratio, facing: b.facing };
  }
  return samples[samples.length - 1]!;
}

/** 서버 스냅샷을 쌓아 두고 조금 늦은 시점을 보간해서 다른 접속자를 부드럽게 보여 준다. */
export class RemotePlayers {
  private buffers = new Map<string, Sample[]>();
  private clockOffset: number | null = null;

  constructor(private selfId: string) {}

  push({ t, players }: WorldSnapshotPayload) {
    const offset = t - Date.now();
    this.clockOffset =
      this.clockOffset === null
        ? offset
        : this.clockOffset + (offset - this.clockOffset) * CLOCK_SMOOTHING;

    const seen = new Set<string>();
    for (const { id, x, y, facing } of players) {
      if (id === this.selfId) continue;
      seen.add(id);
      const samples = this.buffers.get(id) ?? [];
      samples.push({ t, x, y, facing });
      while (samples.length > 1 && samples[0]!.t < t - BUFFER_MS) samples.shift();
      this.buffers.set(id, samples);
    }
    for (const id of this.buffers.keys()) {
      if (!seen.has(id)) this.buffers.delete(id);
    }
  }

  views(): RemotePlayerView[] {
    const renderT = Date.now() + (this.clockOffset ?? 0) - RENDER_DELAY_MS;
    return [...this.buffers].map(([id, samples]) => {
      const now = sampleAt(samples, renderT);
      const before = sampleAt(samples, renderT - MOVING_WINDOW_MS);
      return { id, x: now.x, y: now.y, facing: now.facing, moving: Math.abs(now.x - before.x) > 1 };
    });
  }
}
