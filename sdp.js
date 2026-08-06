/*
 * VORTEX ST 2110 SDP generator — pure logic module (no DOM).
 *
 * Reproduces the exact line ordering of real Magnum-imported / Evertz-authored
 * SDP files (see fixtures in test_sdp.mjs). Dialects differ by author:
 *   - video dialect=magnum: rtpmap, source-filter, fmtp, ts-refclk, mediaclk
 *                           (PM=2110GPM, TP=2110TPW, DUP main/backup)
 *   - video dialect=evertz: ts-refclk, rtpmap, source-filter, fmtp, mediaclk
 *                           (PM=2110BPM, TP=2110TPN, DUP 1P/1S) — used by encap import
 *   - audio / anc (Evertz): ts-refclk, rtpmap, source-filter, fmtp, …, mediaclk
 *
 * A redundant (ST 2022-7) SDP carries BOTH legs in one file joined by
 * a=group:DUP; single-path emits one media section with no group / no mid.
 *
 * Imported by the browser tool (sdp.html) as an ES module and by the Node
 * test runner. Keep this file DOM-free and dependency-free.
 */

// RFC 4566 mandates CRLF between lines.
export const EOL = '\r\n';

// ---------------------------------------------------------------------------
// Presets
// ---------------------------------------------------------------------------

// ST 2110-20 resolution presets — essence fields match the VPID Calculator
// chips: 1080p59.94 SDR = 89 CA 80 01, 720p59.94 SDR = 84 CA 80 01.
// PM/TP follow Magnum/Evertz import dialect (BPM/TPN); user can still edit.
// Essence fields match VPID Calculator chips.
// PM/TP are packing/dialect — left to VIDEO_DEFAULTS / VIDEO_EVERTZ_DEFAULTS / UI.
export const VIDEO_PRESETS = {
  '1080p5994': {
    label: '1080p59.94 SDR',
    vpid: '89CA8001',
    vpidSpaced: '89 CA 80 01',
    width: 1920,
    height: 1080,
    exactframerate: '60000/1001',
    sampling: 'YCbCr-4:2:2',
    depth: 10,
    tcs: 'SDR',
    colorimetry: 'BT709',
    ssn: 'ST2110-20:2017',
  },
  '1080p5994hlg': {
    label: '1080p59.94 HLG Rec.2020',
    vpid: '89DAA001',
    vpidSpaced: '89 DA A0 01',
    width: 1920,
    height: 1080,
    exactframerate: '60000/1001',
    sampling: 'YCbCr-4:2:2',
    depth: 10,
    tcs: 'HLG',
    colorimetry: 'BT2020',
    ssn: 'ST2110-20:2017',
  },
  '720p5994': {
    label: '720p59.94 SDR',
    vpid: '84CA8001',
    vpidSpaced: '84 CA 80 01',
    width: 1280,
    height: 720,
    exactframerate: '60000/1001',
    sampling: 'YCbCr-4:2:2',
    depth: 10,
    tcs: 'SDR',
    colorimetry: 'BT709',
    ssn: 'ST2110-20:2017',
  },
  '2160p5994': {
    label: '2160p59.94 SDR',
    vpid: 'A1CA0001',
    vpidSpaced: 'A1 CA 00 01',
    width: 3840,
    height: 2160,
    exactframerate: '60000/1001',
    sampling: 'YCbCr-4:2:2',
    depth: 10,
    tcs: 'SDR',
    colorimetry: 'BT709',
    ssn: 'ST2110-20:2017',
  },
  '2160p5994hlg': {
    label: '2160p59.94 HLG Rec.2020',
    vpid: 'CEDAA001',
    vpidSpaced: 'CE DA A0 01',
    width: 3840,
    height: 2160,
    exactframerate: '60000/1001',
    sampling: 'YCbCr-4:2:2',
    depth: 10,
    tcs: 'HLG',
    colorimetry: 'BT2020',
    ssn: 'ST2110-20:2017',
  },
};

/** Apply a named VIDEO_PRESETS entry onto a video field bag (does not clear unknown keys). */
export function applyVideoPreset(name, video = {}) {
  const p = VIDEO_PRESETS[name];
  if (!p) return { ...video };
  return {
    ...video,
    width: p.width,
    height: p.height,
    exactframerate: p.exactframerate,
    sampling: p.sampling,
    depth: p.depth,
    tcs: p.tcs,
    colorimetry: p.colorimetry,
    ssn: p.ssn,
  };
}

export const VIDEO_DEFAULTS = {
  dialect: 'magnum', // 'magnum' | 'evertz' — controls fmtp order + attribute order
  sampling: 'YCbCr-4:2:2',
  width: 1920,
  height: 1080,
  depth: 10,
  exactframerate: '60000/1001',
  tcs: 'SDR',
  colorimetry: 'BT709',
  pm: '2110GPM',
  ssn: 'ST2110-20:2017',
  tp: '2110TPW',
};

// Evertz 670ipg / Magnum-imported video defaults (device encap path).
export const VIDEO_EVERTZ_DEFAULTS = {
  dialect: 'evertz',
  pm: '2110BPM',
  tp: '2110TPN',
};

export const AUDIO_DEFAULTS = {
  encoding: 'L24',
  rate: 48000,
  channels: 4,
  channelOrder: 'SMPTE2110.(SGRP)',
  ptime: '0.125',
};

export const ANC_DEFAULTS = {
  vpidCode: 137,
  didSdids: [],
};

// Payload types / labels that match the supplied samples.
export const TYPE_DEFAULTS = {
  video: { payloadType: 96, groupLabels: ['main', 'backup'] },
  audio: { payloadType: 97, groupLabels: ['1P', '1S'] },
  anc: { payloadType: 100, groupLabels: ['1P', '1S'] },
};

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

export function isIPv4(s) {
  if (typeof s !== 'string') return false;
  const m = s.trim().match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  return m.slice(1).every((o) => {
    const n = Number(o);
    return n >= 0 && n <= 255 && String(n) === String(Number(o));
  });
}

export function isMulticastV4(s) {
  if (!isIPv4(s)) return false;
  const first = Number(s.trim().split('.')[0]);
  return first >= 224 && first <= 239;
}

// PTP grandmaster clock identity: 8 hex octets separated by '-'.
export function isGmid(s) {
  return typeof s === 'string' && /^([0-9A-Fa-f]{2}-){7}[0-9A-Fa-f]{2}$/.test(s.trim());
}

function isPort(n) {
  return Number.isInteger(n) && n >= 1 && n <= 65535;
}

// A leg has a usable SSM source only when it is a real unicast address.
// Device exports commonly carry a blank or 0.0.0.0 source (ASM), in which
// case the a=source-filter line is omitted entirely.
export function hasSource(leg) {
  const s = (leg && leg.source !== undefined && leg.source !== null) ? String(leg.source).trim() : '';
  return s !== '' && s !== '0.0.0.0';
}

function isDynamicPt(n) {
  return Number.isInteger(n) && n >= 96 && n <= 127;
}

// ---------------------------------------------------------------------------
// Spec normalisation
// ---------------------------------------------------------------------------

/**
 * Fill a partial spec with type-appropriate defaults so callers (manual form
 * and CSV rows) only need to supply the fields that actually vary.
 */
export function normalizeSpec(input) {
  const spec = { ...input };
  spec.type = String(spec.type || '').toLowerCase();
  const td = TYPE_DEFAULTS[spec.type];

  spec.redundant = spec.redundant === undefined ? true : !!spec.redundant;
  spec.origin = { user: 'MAGNUM', sessId: '0', sessVer: '0', ip: '', ...(spec.origin || {}) };
  spec.sessionName = spec.sessionName === undefined ? '' : String(spec.sessionName);
  spec.ttlLayers = spec.ttlLayers || '64/1';
  spec.gmid = spec.gmid || '00-00-00-00-00-00-00-00';
  spec.ptpDomain = spec.ptpDomain === undefined || spec.ptpDomain === '' ? 0 : Number(spec.ptpDomain);

  if (td) {
    spec.payloadType = spec.payloadType === undefined || spec.payloadType === ''
      ? td.payloadType : Number(spec.payloadType);
    spec.groupLabels = spec.groupLabels && spec.groupLabels.length === 2
      ? spec.groupLabels : td.groupLabels.slice();
  }
  spec.port = spec.port === undefined || spec.port === '' ? 1234 : Number(spec.port);

  // Legs: [{ mcast, source }]. Second leg only used when redundant.
  spec.legs = (spec.legs || []).map((l) => ({ mcast: (l.mcast || '').trim(), source: (l.source || '').trim() }));

  if (spec.type === 'video') {
    spec.video = { ...VIDEO_DEFAULTS, ...(spec.video || {}) };
  } else if (spec.type === 'audio') {
    spec.audio = { ...AUDIO_DEFAULTS, ...(spec.audio || {}) };
  } else if (spec.type === 'anc') {
    spec.anc = { ...ANC_DEFAULTS, ...(spec.anc || {}) };
  }
  return spec;
}

export function validateSpec(rawSpec) {
  const spec = normalizeSpec(rawSpec);
  const errors = [];

  if (!TYPE_DEFAULTS[spec.type]) errors.push(`unknown media type "${spec.type}" (expected video|audio|anc)`);
  if (!spec.sessionName) errors.push('session name (s=) is required');
  if (!isIPv4(spec.origin.ip)) errors.push(`origin IP "${spec.origin.ip}" is not a valid IPv4 address`);
  if (spec.origin.sessId === '' || spec.origin.sessId === undefined) errors.push('origin session id is required');
  if (spec.origin.sessVer === '' || spec.origin.sessVer === undefined) errors.push('origin session version is required');
  if (!isPort(spec.port)) errors.push(`port "${spec.port}" out of range (1-65535)`);
  if (!isDynamicPt(spec.payloadType)) errors.push(`payload type "${spec.payloadType}" out of dynamic range (96-127)`);
  if (!isGmid(spec.gmid)) errors.push(`PTP GMID "${spec.gmid}" must be 8 hex octets separated by '-'`);
  if (!(Number.isInteger(spec.ptpDomain) && spec.ptpDomain >= 0 && spec.ptpDomain <= 127)) {
    errors.push(`PTP domain "${spec.ptpDomain}" out of range (0-127)`);
  }

  const legCount = spec.redundant ? 2 : 1;
  if (spec.legs.length < legCount) {
    errors.push(`${legCount} leg(s) required but ${spec.legs.length} provided`);
  }
  spec.legs.slice(0, legCount).forEach((leg, i) => {
    const tag = spec.redundant ? (i === 0 ? 'primary' : 'secondary') : 'single';
    if (!isMulticastV4(leg.mcast)) errors.push(`${tag} leg multicast "${leg.mcast}" is not a valid multicast IPv4 (224-239)`);
    // Source is optional (ASM); only validate it when a real source is given.
    if (hasSource(leg) && !isIPv4(leg.source)) errors.push(`${tag} leg source "${leg.source}" is not a valid IPv4 address`);
  });

  if (spec.type === 'video') {
    const v = spec.video;
    if (!(Number(v.width) > 0)) errors.push('video width must be a positive integer');
    if (!(Number(v.height) > 0)) errors.push('video height must be a positive integer');
    if (![8, 10, 12, 16].includes(Number(v.depth))) errors.push(`video depth "${v.depth}" must be one of 8, 10, 12, 16`);
    if (!/^\d+(\/\d+)?$/.test(String(v.exactframerate))) errors.push(`video exactframerate "${v.exactframerate}" must be an integer or M/N ratio`);
  } else if (spec.type === 'audio') {
    const a = spec.audio;
    if (!/^L(16|24)$/.test(String(a.encoding))) errors.push(`audio encoding "${a.encoding}" must be L16 or L24`);
    if (!(Number(a.rate) > 0)) errors.push('audio sample rate must be a positive integer');
    if (!(Number.isInteger(Number(a.channels)) && Number(a.channels) >= 1 && Number(a.channels) <= 64)) {
      errors.push(`audio channel count "${a.channels}" out of range (1-64)`);
    }
    if (!/^\d+(\.\d+)?$/.test(String(a.ptime))) errors.push(`audio ptime "${a.ptime}" must be numeric (ms)`);
  } else if (spec.type === 'anc') {
    const n = spec.anc;
    const hasVpid = n.vpidCode !== '' && n.vpidCode !== undefined && n.vpidCode !== null;
    const hasDid = Array.isArray(n.didSdids) && n.didSdids.length > 0;
    if (!hasVpid && !hasDid) errors.push('ANC requires a VPID_Code and/or at least one DID_SDID');
    if (hasVpid && !Number.isInteger(Number(n.vpidCode))) errors.push(`ANC VPID_Code "${n.vpidCode}" must be an integer`);
    if (hasDid) {
      n.didSdids.forEach((d) => {
        if (!/^0x[0-9A-Fa-f]{1,2}$/.test(String(d.did)) || !/^0x[0-9A-Fa-f]{1,2}$/.test(String(d.sdid))) {
          errors.push(`ANC DID_SDID {${d.did},${d.sdid}} must be 0x-prefixed hex bytes`);
        }
      });
    }
  }

  return { ok: errors.length === 0, errors, spec };
}

// ---------------------------------------------------------------------------
// SDP builders
// ---------------------------------------------------------------------------

function sessionHeader(spec) {
  const lines = [
    'v=0',
    `o=${spec.origin.user} ${spec.origin.sessId} ${spec.origin.sessVer} IN IP4 ${spec.origin.ip}`,
    `s=${spec.sessionName}`,
    't=0 0',
  ];
  if (spec.redundant) lines.push(`a=group:DUP ${spec.groupLabels[0]} ${spec.groupLabels[1]}`);
  return lines;
}

function tsRefclk(spec) {
  return `a=ts-refclk:ptp=IEEE1588-2008:${spec.gmid}:${spec.ptpDomain}`;
}

function sourceFilter(leg) {
  return `a=source-filter: incl IN IP4 ${leg.mcast} ${leg.source}`;
}

function videoFmtp(pt, v) {
  // Magnum-authored vs Evertz-authored fmtp parameter orders differ; both keep
  // a trailing ';' after the last parameter.
  const parts = v.dialect === 'evertz'
    ? [
      `sampling=${v.sampling}`,
      `depth=${v.depth}`,
      `width=${v.width}`,
      `height=${v.height}`,
      `exactframerate=${v.exactframerate}`,
      `colorimetry=${v.colorimetry}`,
      `PM=${v.pm}`,
      `SSN=${v.ssn}`,
      `TP=${v.tp}`,
      `TCS=${v.tcs}`,
    ]
    : [
      `sampling=${v.sampling}`,
      `width=${v.width}`,
      `height=${v.height}`,
      `depth=${v.depth}`,
      `exactframerate=${v.exactframerate}`,
      `TCS=${v.tcs}`,
      `colorimetry=${v.colorimetry}`,
      `PM=${v.pm}`,
      `SSN=${v.ssn}`,
      `TP=${v.tp}`,
    ];
  return `a=fmtp:${pt} ${parts.join('; ')};`;
}

function ancFmtp(pt, n) {
  const parts = [];
  const hasVpid = n.vpidCode !== '' && n.vpidCode !== undefined && n.vpidCode !== null;
  if (Array.isArray(n.didSdids)) n.didSdids.forEach((d) => parts.push(`DID_SDID={${d.did},${d.sdid}}`));
  if (hasVpid) parts.push(`VPID_Code=${n.vpidCode}`);
  return `a=fmtp:${pt} ${parts.join('; ')}`;
}

function videoLeg(spec, leg, midLabel) {
  const pt = spec.payloadType;
  const lines = [
    `m=video ${spec.port} RTP/AVP ${pt}`,
    `c=IN IP4 ${leg.mcast}/${spec.ttlLayers}`,
  ];
  if (spec.video.dialect === 'evertz') {
    // Evertz/Magnum-imported: ts-refclk before rtpmap (same family as audio/anc).
    lines.push(tsRefclk(spec), `a=rtpmap:${pt} raw/90000`);
    if (hasSource(leg)) lines.push(sourceFilter(leg));
    lines.push(videoFmtp(pt, spec.video), 'a=mediaclk:direct=0');
  } else {
    // Magnum-authored: rtpmap → source-filter → fmtp → ts-refclk.
    lines.push(`a=rtpmap:${pt} raw/90000`);
    if (hasSource(leg)) lines.push(sourceFilter(leg));
    lines.push(videoFmtp(pt, spec.video), tsRefclk(spec), 'a=mediaclk:direct=0');
  }
  if (spec.redundant) lines.push(`a=mid:${midLabel}`);
  return lines;
}

function audioLeg(spec, leg, midLabel) {
  const pt = spec.payloadType;
  const a = spec.audio;
  const lines = [
    `m=audio ${spec.port} RTP/AVP ${pt}`,
    `c=IN IP4 ${leg.mcast}/${spec.ttlLayers}`,
    tsRefclk(spec),
    `a=rtpmap:${pt} ${a.encoding}/${a.rate}/${a.channels}`,
  ];
  if (hasSource(leg)) lines.push(sourceFilter(leg));
  lines.push(`a=fmtp:${pt} channel-order=${a.channelOrder}`, `a=ptime:${a.ptime}`, 'a=mediaclk:direct=0');
  if (spec.redundant) lines.push(`a=mid:${midLabel}`);
  return lines;
}

function ancLeg(spec, leg, midLabel) {
  const pt = spec.payloadType;
  // ST 2110-40 ANC is carried on an m=video line per RFC 8331.
  const lines = [
    `m=video ${spec.port} RTP/AVP ${pt}`,
    `c=IN IP4 ${leg.mcast}/${spec.ttlLayers}`,
    tsRefclk(spec),
    `a=rtpmap:${pt} smpte291/90000`,
  ];
  if (hasSource(leg)) lines.push(sourceFilter(leg));
  lines.push(ancFmtp(pt, spec.anc), 'a=mediaclk:direct=0');
  if (spec.redundant) lines.push(`a=mid:${midLabel}`);
  return lines;
}

const LEG_BUILDERS = { video: videoLeg, audio: audioLeg, anc: ancLeg };

/** Build the SDP as an array of lines (line-ending agnostic; used by tests). */
export function buildSdpLines(rawSpec) {
  const spec = normalizeSpec(rawSpec);
  const buildLeg = LEG_BUILDERS[spec.type];
  if (!buildLeg) throw new Error(`cannot build SDP for unknown type "${spec.type}"`);

  const lines = sessionHeader(spec);
  const legCount = spec.redundant ? 2 : 1;
  for (let i = 0; i < legCount; i++) {
    lines.push(...buildLeg(spec, spec.legs[i], spec.groupLabels[i]));
  }
  return lines;
}

/** Build the SDP text (CRLF, trailing CRLF as is conventional for .sdp). */
export function buildSdp(rawSpec) {
  return buildSdpLines(rawSpec).join(EOL) + EOL;
}

/** Derive a safe .sdp filename from the spec (Single-form download). */
export function sdpFilename(rawSpec) {
  const spec = normalizeSpec(rawSpec);
  const base = (spec.sessionName || spec.type || 'stream')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^A-Za-z0-9._-]/g, '');
  const safe = base || 'stream';
  return `${safe}_${spec.type}.sdp`;
}

/**
 * Bulk export filename: primary multicast + destination port, e.g. 238.0.246.2_1234.txt
 */
export function exportFilename(rawSpec) {
  const spec = normalizeSpec(rawSpec);
  const mcast = (spec.legs[0] && spec.legs[0].mcast) ? String(spec.legs[0].mcast).trim() : '0.0.0.0';
  const port = spec.port || 1234;
  const safeMcast = mcast.replace(/[^0-9.]/g, '') || '0.0.0.0';
  return `${safeMcast}_${port}.txt`;
}

/**
 * Apply Bulk-page overrides onto a already-built spec. Blank / unset options leave
 * the existing value alone so CSV/encap-derived transport fields stay intact.
 */
export function applyBulkOverrides(rawSpec, options = {}) {
  const o = options || {};
  const spec = normalizeSpec(rawSpec);

  if (o.originUser) spec.origin.user = o.originUser;
  if (o.originIp) spec.origin.ip = o.originIp;
  if (o.sessId !== undefined && o.sessId !== '') spec.origin.sessId = String(o.sessId);
  if (o.sessVer !== undefined && o.sessVer !== '') spec.origin.sessVer = String(o.sessVer);
  if (o.sessionNameTemplate) {
    spec.sessionName = String(o.sessionNameTemplate)
      .replace(/\{type\}/g, spec.type)
      .replace(/\{device\}/g, '')
      .replace(/\{mediaPort\}/g, spec.sessionName)
      .replace(/\{index\}/g, '');
  } else if (o.sessionName) {
    spec.sessionName = o.sessionName;
  }
  if (o.groupLabelA && o.groupLabelB) spec.groupLabels = [o.groupLabelA, o.groupLabelB];
  if (o.gmid) spec.gmid = o.gmid;
  if (o.ptpDomain !== undefined && o.ptpDomain !== '') spec.ptpDomain = Number(o.ptpDomain);
  if (o.ttlLayers) spec.ttlLayers = o.ttlLayers;
  if (o.port !== undefined && o.port !== '') spec.port = Number(o.port);

  if (o.sourcePrimary || o.sourceSecondary) {
    if (spec.legs[0]) spec.legs[0] = { ...spec.legs[0], source: o.sourcePrimary || spec.legs[0].source };
    if (spec.legs[1] && o.sourceSecondary) {
      spec.legs[1] = { ...spec.legs[1], source: o.sourceSecondary };
    }
  }

  if (spec.type === 'video') {
    if (o.payloadTypeVideo !== undefined && o.payloadTypeVideo !== '') spec.payloadType = Number(o.payloadTypeVideo);
    let video = { ...spec.video };
    if (o.videoPreset) video = applyVideoPreset(o.videoPreset, video);
    video = {
      ...video,
      ...(o.videoSampling ? { sampling: o.videoSampling } : {}),
      ...(o.videoWidth ? { width: Number(o.videoWidth) } : {}),
      ...(o.videoHeight ? { height: Number(o.videoHeight) } : {}),
      ...(o.videoDepth ? { depth: Number(o.videoDepth) } : {}),
      ...(o.videoExactframerate ? { exactframerate: o.videoExactframerate } : {}),
      ...(o.videoTcs ? { tcs: o.videoTcs } : {}),
      ...(o.videoColorimetry ? { colorimetry: o.videoColorimetry } : {}),
      ...(o.videoPm ? { pm: o.videoPm } : {}),
      ...(o.videoSsn ? { ssn: o.videoSsn } : {}),
      ...(o.videoTp ? { tp: o.videoTp } : {}),
      ...(o.videoDialect ? { dialect: o.videoDialect } : {}),
    };
    spec.video = video;
  } else if (spec.type === 'audio') {
    if (o.payloadTypeAudio !== undefined && o.payloadTypeAudio !== '') spec.payloadType = Number(o.payloadTypeAudio);
    spec.audio = {
      ...spec.audio,
      ...(o.audioEncoding ? { encoding: o.audioEncoding } : {}),
      ...(o.audioRate ? { rate: Number(o.audioRate) } : {}),
      ...(o.audioChannels ? { channels: Number(o.audioChannels) } : {}),
      ...(o.audioChannelOrder ? { channelOrder: o.audioChannelOrder } : {}),
      ...(o.audioPtime ? { ptime: o.audioPtime } : {}),
    };
  } else if (spec.type === 'anc') {
    if (o.payloadTypeAnc !== undefined && o.payloadTypeAnc !== '') spec.payloadType = Number(o.payloadTypeAnc);
    spec.anc = {
      ...spec.anc,
      ...(o.ancVpidCode !== undefined && o.ancVpidCode !== '' ? { vpidCode: Number(o.ancVpidCode) } : {}),
    };
  }
  return spec;
}

// ---------------------------------------------------------------------------
// CSV (bulk) support
// ---------------------------------------------------------------------------

export const CSV_COLUMNS = [
  'type', 'session_name', 'origin_user', 'origin_ip', 'session_id', 'session_version',
  'payload_type', 'port', 'ttl_layers', 'gmid', 'ptp_domain', 'redundant',
  'group_a', 'group_b', 'mcast_a', 'source_a', 'mcast_b', 'source_b',
  'video_preset', 'video_sampling', 'video_width', 'video_height', 'video_depth',
  'video_exactframerate', 'video_tcs', 'video_colorimetry', 'video_pm', 'video_ssn', 'video_tp',
  'audio_encoding', 'audio_rate', 'audio_channels', 'audio_channel_order', 'audio_ptime',
  'anc_vpid_code', 'anc_did_sdid',
];

function csvEscape(v) {
  const s = v === undefined || v === null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// Build one CSV line from a column-keyed object, guaranteeing alignment with
// CSV_COLUMNS regardless of how many fields are populated.
function csvRow(rec) {
  return CSV_COLUMNS.map((c) => csvEscape(rec[c])).join(',');
}

export function csvTemplate() {
  const header = CSV_COLUMNS.join(',');
  const rows = [
    // A redundant video row using the 1080p59.94 preset.
    {
      type: 'video', session_name: 'DC-0501_ORT-T_0501A sdp', origin_user: 'MAGNUM',
      origin_ip: '10.198.5.101', session_id: '1604610747', session_version: '1604610747',
      payload_type: 96, port: 1234, ttl_layers: '64/1', gmid: '00-00-00-00-00-00-00-00',
      ptp_domain: 0, redundant: 'yes', group_a: 'main', group_b: 'backup',
      mcast_a: '238.0.203.15', source_a: '10.198.34.87',
      mcast_b: '238.0.203.55', source_b: '10.198.66.87', video_preset: '1080p5994',
    },
    // A redundant audio row.
    {
      type: 'audio', session_name: '670ipg', origin_user: 'Evertz', origin_ip: '10.198.24.151',
      session_id: '0102', session_version: '23', payload_type: 97, port: 1234, ttl_layers: '64/1',
      gmid: '00-02-C5-FF-FE-2E-43-75', ptp_domain: 100, redundant: 'yes', group_a: '1P', group_b: '1S',
      mcast_a: '238.0.139.122', source_a: '10.198.32.165',
      mcast_b: '238.0.139.116', source_b: '10.198.64.165',
      audio_encoding: 'L24', audio_rate: 48000, audio_channels: 4,
      audio_channel_order: 'SMPTE2110.(SGRP)', audio_ptime: '0.125',
    },
    // A redundant ANC row.
    {
      type: 'anc', session_name: '670ipg', origin_user: 'Evertz', origin_ip: '10.198.24.151',
      session_id: '0106', session_version: '23', payload_type: 100, port: 1234, ttl_layers: '64/1',
      gmid: '00-02-C5-FF-FE-2E-43-75', ptp_domain: 100, redundant: 'yes', group_a: '1P', group_b: '1S',
      mcast_a: '238.0.139.118', source_a: '10.198.32.165',
      mcast_b: '238.0.139.112', source_b: '10.198.64.165', anc_vpid_code: 137,
    },
  ];
  return [header, ...rows.map(csvRow)].join('\n') + '\n';
}

/** Minimal RFC-4180-ish CSV parser (handles quoted fields with commas/quotes). */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  const s = String(text).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; }
      } else { field += c; }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field); field = '';
    } else if (c === '\n') {
      row.push(field); rows.push(row); row = []; field = '';
    } else {
      field += c;
    }
  }
  // Flush trailing field/row if the file has no final newline.
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ''));
}

function parseBool(v) {
  const s = String(v).trim().toLowerCase();
  if (s === '') return true; // default to redundant
  return ['1', 'yes', 'true', 'y', 'dup', 'redundant'].includes(s);
}

/** Convert one parsed CSV record (object keyed by CSV_COLUMNS) into a spec. */
export function rowToSpec(rec) {
  const type = String(rec.type || '').trim().toLowerCase();
  const redundant = parseBool(rec.redundant);

  const legs = [{ mcast: rec.mcast_a, source: rec.source_a }];
  if (redundant) legs.push({ mcast: rec.mcast_b, source: rec.source_b });

  const groupLabels = (rec.group_a || rec.group_b)
    ? [rec.group_a || '', rec.group_b || '']
    : undefined;

  const spec = {
    type,
    redundant,
    sessionName: rec.session_name,
    origin: {
      user: rec.origin_user || 'MAGNUM',
      sessId: rec.session_id,
      sessVer: rec.session_version,
      ip: rec.origin_ip,
    },
    payloadType: rec.payload_type,
    port: rec.port,
    ttlLayers: rec.ttl_layers || '64/1',
    gmid: rec.gmid,
    ptpDomain: rec.ptp_domain,
    groupLabels,
    legs,
  };

  if (type === 'video') {
    const fromPreset = String(rec.video_preset || '').trim()
      ? applyVideoPreset(String(rec.video_preset).trim(), {})
      : {};
    spec.video = {
      sampling: rec.video_sampling || fromPreset.sampling || VIDEO_DEFAULTS.sampling,
      width: rec.video_width || fromPreset.width || VIDEO_DEFAULTS.width,
      height: rec.video_height || fromPreset.height || VIDEO_DEFAULTS.height,
      depth: rec.video_depth || fromPreset.depth || VIDEO_DEFAULTS.depth,
      exactframerate: rec.video_exactframerate || fromPreset.exactframerate || VIDEO_DEFAULTS.exactframerate,
      tcs: rec.video_tcs || fromPreset.tcs || VIDEO_DEFAULTS.tcs,
      colorimetry: rec.video_colorimetry || fromPreset.colorimetry || VIDEO_DEFAULTS.colorimetry,
      pm: rec.video_pm || VIDEO_DEFAULTS.pm,
      ssn: rec.video_ssn || fromPreset.ssn || VIDEO_DEFAULTS.ssn,
      tp: rec.video_tp || VIDEO_DEFAULTS.tp,
    };
  } else if (type === 'audio') {
    spec.audio = {
      encoding: rec.audio_encoding || AUDIO_DEFAULTS.encoding,
      rate: rec.audio_rate || AUDIO_DEFAULTS.rate,
      channels: rec.audio_channels || AUDIO_DEFAULTS.channels,
      channelOrder: rec.audio_channel_order || AUDIO_DEFAULTS.channelOrder,
      ptime: rec.audio_ptime || AUDIO_DEFAULTS.ptime,
    };
  } else if (type === 'anc') {
    const didSdids = [];
    // anc_did_sdid packs one or more pairs as "0x61/0x02|0x41/0x05".
    String(rec.anc_did_sdid || '').split('|').map((p) => p.trim()).filter(Boolean).forEach((pair) => {
      const [did, sdid] = pair.split('/').map((x) => x.trim());
      if (did && sdid) didSdids.push({ did, sdid });
    });
    spec.anc = {
      vpidCode: String(rec.anc_vpid_code || '').trim(),
      didSdids,
    };
  }
  return spec;
}

/** Parse a full CSV document into { specs, errors } keyed by row number. */
export function csvToSpecs(text) {
  const rows = parseCsv(text);
  if (rows.length === 0) return { header: [], records: [] };
  const header = rows[0].map((h) => h.trim());
  const records = rows.slice(1).map((cols, idx) => {
    const rec = {};
    header.forEach((h, i) => { rec[h] = cols[i] !== undefined ? cols[i] : ''; });
    return { line: idx + 2, rec, spec: rowToSpec(rec) };
  });
  return { header, records };
}

// ---------------------------------------------------------------------------
// Device encap stream-table import (Evertz-style export)
// ---------------------------------------------------------------------------
//
// Maps a device's flow table:
//   Device, Media Port, Ethernet, Stream Type, Stream Index,
//   Destination IP, Destination Port, Source IP, Bitrate (Mbps), Backup
// into ST 2110 SDP specs. Only the uncompressed essence stream types map:
//   Video -> 2110-20, Audio -> 2110-30 (one per Stream Index), ANC -> 2110-40.
// Everything else (Full / Full (J2K|H.264|MPEG-2|JPEG-XS), blank) is skipped
// and reported. Primary/secondary legs are paired by
// (Device, Media Port, Stream Type, Stream Index) using the Backup flag.

const ENCAP_TYPE_MAP = { video: 'video', audio: 'audio', anc: 'anc' };

export const ENCAP_IMPORT_DEFAULTS = {
  originUser: 'Evertz',
  originIp: '10.198.24.151',
  sessId: '',                 // '' => auto-incrementing per file (unique)
  sessVer: '',                // '' => same as sessId
  sessionNameTemplate: '',    // '' => Media Port (audio appends -A{index}); tokens: {device} {mediaPort} {type} {index}
  groupLabelA: '',            // '' => per-type default (video main/backup, audio+anc 1P/1S)
  groupLabelB: '',
  gmid: '00-02-C5-FF-FE-2E-43-75',
  ptpDomain: 100,
  sourcePrimary: '',          // '' => omit a=source-filter (ASM). The export lacks a
  sourceSecondary: '',        //       per-flow source, so these apply to ALL rows.
  sourceMap: null,            // optional { [device]: { primary, secondary } }; wins over the globals.
  videoPreset: '1080p5994',
  videoPm: '2110BPM',
  videoTp: '2110TPN',
  videoSampling: 'YCbCr-4:2:2',
  videoDepth: 10,
  videoTcs: 'SDR',
  videoColorimetry: 'BT709',
  videoSsn: 'ST2110-20:2017',
  videoDialect: 'evertz',
  // Encap video uses Evertz DUP labels unless the user overrides both.
  videoGroupLabels: ['1P', '1S'],
  payloadTypeVideo: 96,
  payloadTypeAudio: 97,
  payloadTypeAnc: 100,
  ttlLayers: '64/1',
  port: '', // blank = keep Destination Port from CSV
  audioEncoding: 'L24',
  audioRate: 48000,
  audioChannels: 4,
  audioChannelOrder: 'SMPTE2110.(SGRP)',
  audioPtime: '0.125',
  ancVpidCode: 137,
  pairLegs: true,
};

function renderNameTemplate(tpl, ctx) {
  return String(tpl).replace(/\{(device|mediaPort|type|index)\}/g, (_, k) => (ctx[k] === undefined ? '' : ctx[k]));
}

/**
 * Parse a device -> source-IP mapping CSV used to fill a=source-filter per flow
 * (the encap export has no per-flow source). Expected columns (case-insensitive):
 *   key|device, source_primary, source_secondary
 * Returns { [device]: { primary, secondary } }.
 */
export function parseSourceMap(text) {
  const map = {};
  const rows = parseCsv(text);
  if (rows.length === 0) return map;
  const header = rows[0].map((h) => String(h).trim().toLowerCase());
  const ki = header.indexOf('key') !== -1 ? header.indexOf('key') : header.indexOf('device');
  const pi = header.indexOf('source_primary');
  const si = header.indexOf('source_secondary');
  if (ki === -1 || pi === -1) return map;
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const key = String(r[ki] === undefined ? '' : r[ki]).trim();
    if (!key) continue;
    map[key] = {
      primary: String(r[pi] === undefined ? '' : r[pi]).trim(),
      secondary: si === -1 ? '' : String(r[si] === undefined ? '' : r[si]).trim(),
    };
  }
  return map;
}

export function isEncapHeader(header) {
  const h = (header || []).map((x) => String(x).trim().toLowerCase());
  return h.includes('device') && h.includes('media port') && h.includes('stream type') &&
         h.includes('destination ip') && h.includes('backup');
}

/**
 * Convert a device encap CSV into { specs, skipped, mapped }.
 *  - specs:   array of SDP specs ready for validateSpec/buildSdp
 *  - skipped: { <reason>: count } for rows not turned into 2110 SDPs
 *  - mapped:  number of specs produced
 */
export function encapToSpecs(text, options = {}) {
  const o = { ...ENCAP_IMPORT_DEFAULTS, ...options };
  const rows = parseCsv(text);
  if (rows.length === 0) return { specs: [], skipped: {}, mapped: 0 };

  const header = rows[0].map((x) => String(x).trim());
  const idx = {};
  header.forEach((h, i) => { idx[h.toLowerCase()] = i; });
  const col = (r, name) => { const i = idx[name]; return i === undefined ? '' : String(r[i] === undefined ? '' : r[i]).trim(); };

  const skipped = {};
  const bump = (reason) => { skipped[reason] = (skipped[reason] || 0) + 1; };

  // Group legs by essence identity, preserving first-seen order.
  const groups = new Map();
  for (let li = 1; li < rows.length; li++) {
    const r = rows[li];
    const stype = col(r, 'stream type');
    const mapped = ENCAP_TYPE_MAP[stype.toLowerCase()];
    if (!mapped) { bump(stype || '(blank)'); continue; }
    const mcast = col(r, 'destination ip');
    if (!isMulticastV4(mcast)) { bump('invalid/blank destination ip'); continue; }

    const device = col(r, 'device');
    const mport = col(r, 'media port');
    const sidx = col(r, 'stream index');
    const port = Number(col(r, 'destination port')) || 1234;
    const source = col(r, 'source ip');
    const isBackup = /^true$/i.test(col(r, 'backup'));

    const key = [device, mport, mapped, sidx].join('|');
    let g = groups.get(key);
    if (!g) { g = { type: mapped, device, mport, sidx, port, primary: null, secondary: null }; groups.set(key, g); }
    const leg = { mcast, source };
    if (isBackup) g.secondary = leg; else g.primary = leg;
  }

  let counter = 1;
  const specs = [];
  for (const g of groups.values()) {
    const primary = g.primary || g.secondary; // fall back if only a backup leg exists
    const redundant = !!(o.pairLegs && g.primary && g.secondary);
    // Source-filter precedence: per-device map > global override > (blank) export source.
    const dm = (o.sourceMap && o.sourceMap[g.device]) || null;
    const primSrc = (dm && dm.primary) || o.sourcePrimary || primary.source;
    const secSrc = (dm && dm.secondary) || o.sourceSecondary || (g.secondary && g.secondary.source) || '';
    const legs = [{ mcast: primary.mcast, source: primSrc }];
    if (redundant) legs.push({ mcast: g.secondary.mcast, source: secSrc });

    const seq = String(counter++);
    const sess = o.sessId !== '' && o.sessId !== undefined ? String(o.sessId) : seq;
    const sessV = o.sessVer !== '' && o.sessVer !== undefined ? String(o.sessVer) : sess;
    const sessionName = o.sessionNameTemplate
      ? renderNameTemplate(o.sessionNameTemplate, { device: g.device, mediaPort: g.mport, type: g.type, index: g.sidx })
      : (g.type === 'audio' && g.sidx ? `${g.mport}-A${g.sidx}` : g.mport);
    const spec = {
      type: g.type,
      redundant,
      sessionName,
      origin: { user: o.originUser, ip: o.originIp, sessId: sess, sessVer: sessV },
      port: g.port,
      gmid: o.gmid,
      ptpDomain: o.ptpDomain,
      legs,
    };
    if (o.groupLabelA && o.groupLabelB) {
      spec.groupLabels = [o.groupLabelA, o.groupLabelB];
    } else if (g.type === 'video' && o.videoGroupLabels) {
      spec.groupLabels = o.videoGroupLabels.slice();
    }
    if (g.type === 'video') {
      const pr = applyVideoPreset(o.videoPreset || '1080p5994', {});
      spec.payloadType = o.payloadTypeVideo !== undefined && o.payloadTypeVideo !== ''
        ? Number(o.payloadTypeVideo) : TYPE_DEFAULTS.video.payloadType;
      if (o.ttlLayers) spec.ttlLayers = o.ttlLayers;
      if (o.port !== undefined && o.port !== '') spec.port = Number(o.port);
      spec.video = {
        ...VIDEO_DEFAULTS,
        ...VIDEO_EVERTZ_DEFAULTS,
        ...pr,
        dialect: o.videoDialect || VIDEO_EVERTZ_DEFAULTS.dialect,
        sampling: o.videoSampling || pr.sampling,
        depth: o.videoDepth !== undefined && o.videoDepth !== '' ? Number(o.videoDepth) : pr.depth,
        tcs: o.videoTcs || pr.tcs,
        colorimetry: o.videoColorimetry || pr.colorimetry,
        pm: o.videoPm || VIDEO_EVERTZ_DEFAULTS.pm,
        ssn: o.videoSsn || pr.ssn,
        tp: o.videoTp || VIDEO_EVERTZ_DEFAULTS.tp,
        width: o.videoWidth ? Number(o.videoWidth) : pr.width,
        height: o.videoHeight ? Number(o.videoHeight) : pr.height,
        exactframerate: o.videoExactframerate || pr.exactframerate,
      };
    } else if (g.type === 'audio') {
      spec.payloadType = o.payloadTypeAudio !== undefined && o.payloadTypeAudio !== ''
        ? Number(o.payloadTypeAudio) : TYPE_DEFAULTS.audio.payloadType;
      if (o.ttlLayers) spec.ttlLayers = o.ttlLayers;
      if (o.port !== undefined && o.port !== '') spec.port = Number(o.port);
      spec.audio = {
        encoding: o.audioEncoding, rate: o.audioRate, channels: o.audioChannels,
        channelOrder: o.audioChannelOrder, ptime: o.audioPtime,
      };
    } else if (g.type === 'anc') {
      spec.payloadType = o.payloadTypeAnc !== undefined && o.payloadTypeAnc !== ''
        ? Number(o.payloadTypeAnc) : TYPE_DEFAULTS.anc.payloadType;
      if (o.ttlLayers) spec.ttlLayers = o.ttlLayers;
      if (o.port !== undefined && o.port !== '') spec.port = Number(o.port);
      spec.anc = { vpidCode: o.ancVpidCode, didSdids: [] };
    }
    specs.push(spec);
  }
  return { specs, skipped, mapped: specs.length };
}

// ---------------------------------------------------------------------------
// Minimal ZIP writer (STORE / no compression, no dependencies)
// ---------------------------------------------------------------------------

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function u8(strOrBytes) {
  return typeof strOrBytes === 'string' ? new TextEncoder().encode(strOrBytes) : strOrBytes;
}

/**
 * Build a ZIP archive (stored, no compression) from
 * [{ name, data }] where data is a string or Uint8Array.
 * Returns a Uint8Array. Sufficient for a handful of small text .sdp files.
 */
export function makeZip(files) {
  const enc = new TextEncoder();
  const chunks = [];
  const central = [];
  let offset = 0;

  const push = (arr) => { chunks.push(arr); offset += arr.length; };
  const writeU16 = (view, o, v) => view.setUint16(o, v, true);
  const writeU32 = (view, o, v) => view.setUint32(o, v >>> 0, true);

  for (const f of files) {
    const nameBytes = enc.encode(f.name);
    const dataBytes = u8(f.data);
    const crc = crc32(dataBytes);
    const localOffset = offset;

    const lh = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(lh.buffer);
    writeU32(lv, 0, 0x04034b50); // local file header signature
    writeU16(lv, 4, 20);         // version needed
    writeU16(lv, 6, 0);          // flags
    writeU16(lv, 8, 0);          // method: store
    writeU16(lv, 10, 0);         // mod time
    writeU16(lv, 12, 0);         // mod date
    writeU32(lv, 14, crc);
    writeU32(lv, 18, dataBytes.length); // compressed size
    writeU32(lv, 22, dataBytes.length); // uncompressed size
    writeU16(lv, 26, nameBytes.length);
    writeU16(lv, 28, 0);         // extra length
    lh.set(nameBytes, 30);
    push(lh);
    push(dataBytes);

    const ch = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(ch.buffer);
    writeU32(cv, 0, 0x02014b50); // central dir header signature
    writeU16(cv, 4, 20);         // version made by
    writeU16(cv, 6, 20);         // version needed
    writeU16(cv, 8, 0);          // flags
    writeU16(cv, 10, 0);         // method
    writeU16(cv, 12, 0);         // mod time
    writeU16(cv, 14, 0);         // mod date
    writeU32(cv, 16, crc);
    writeU32(cv, 20, dataBytes.length);
    writeU32(cv, 24, dataBytes.length);
    writeU16(cv, 28, nameBytes.length);
    writeU16(cv, 30, 0);         // extra length
    writeU16(cv, 32, 0);         // comment length
    writeU16(cv, 34, 0);         // disk number
    writeU16(cv, 36, 0);         // internal attrs
    writeU32(cv, 38, 0);         // external attrs
    writeU32(cv, 42, localOffset);
    ch.set(nameBytes, 46);
    central.push(ch);
  }

  const centralStart = offset;
  central.forEach(push);
  const centralSize = offset - centralStart;

  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  writeU32(ev, 0, 0x06054b50); // EOCD signature
  writeU16(ev, 4, 0);          // disk number
  writeU16(ev, 6, 0);          // central dir disk
  writeU16(ev, 8, files.length);
  writeU16(ev, 10, files.length);
  writeU32(ev, 12, centralSize);
  writeU32(ev, 16, centralStart);
  writeU16(ev, 20, 0);         // comment length
  push(eocd);

  const out = new Uint8Array(offset);
  let p = 0;
  for (const c of chunks) { out.set(c, p); p += c.length; }
  return out;
}
