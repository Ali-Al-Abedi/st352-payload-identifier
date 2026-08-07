/*
 * Fixture tests for the ST 2110 SDP generator (sdp.js).
 * Run with Node's built-in test runner:
 *
 *   node --test tests/test_sdp.mjs
 *
 * The redundant video/audio/anc fixtures are the exact known-good samples
 * supplied from the Magnum/Evertz environment, so a byte-for-line match proves
 * the generator reproduces the real dialect.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildSdpLines,
  buildSdp,
  EOL,
  validateSpec,
  sdpFilename,
  csvTemplate,
  csvToSpecs,
  makeZip,
  crc32,
  isEncapHeader,
  encapToSpecs,
  parseSourceMap,
  exportFilename,
  exportFilenames,
  bulkExportFiles,
  applyBulkOverrides,
  VIDEO_PRESETS,
  applyVideoPreset,
} from '../sdp.js';

const VIDEO_SPEC = {
  type: 'video',
  redundant: true,
  sessionName: 'DC-0501_ORT-T_0501A sdp',
  origin: { user: 'MAGNUM', sessId: '1604610747', sessVer: '1604610747', ip: '10.198.5.101' },
  payloadType: 96,
  port: 1234,
  gmid: '00-00-00-00-00-00-00-00',
  ptpDomain: 0,
  groupLabels: ['main', 'backup'],
  legs: [
    { mcast: '238.0.203.15', source: '10.198.34.87' },
    { mcast: '238.0.203.55', source: '10.198.66.87' },
  ],
  video: { width: 1920, height: 1080 },
};

const VIDEO_LINES = [
  'v=0',
  'o=MAGNUM 1604610747 1604610747 IN IP4 10.198.5.101',
  's=DC-0501_ORT-T_0501A sdp',
  't=0 0',
  'a=group:DUP main backup',
  'm=video 1234 RTP/AVP 96',
  'c=IN IP4 238.0.203.15/64/1',
  'a=rtpmap:96 raw/90000',
  'a=source-filter: incl IN IP4 238.0.203.15 10.198.34.87',
  'a=fmtp:96 sampling=YCbCr-4:2:2; width=1920; height=1080; depth=10; exactframerate=60000/1001; TCS=SDR; colorimetry=BT709; PM=2110GPM; SSN=ST2110-20:2017; TP=2110TPW;',
  'a=ts-refclk:ptp=IEEE1588-2008:00-00-00-00-00-00-00-00:0',
  'a=mediaclk:direct=0',
  'a=mid:main',
  'm=video 1234 RTP/AVP 96',
  'c=IN IP4 238.0.203.55/64/1',
  'a=rtpmap:96 raw/90000',
  'a=source-filter: incl IN IP4 238.0.203.55 10.198.66.87',
  'a=fmtp:96 sampling=YCbCr-4:2:2; width=1920; height=1080; depth=10; exactframerate=60000/1001; TCS=SDR; colorimetry=BT709; PM=2110GPM; SSN=ST2110-20:2017; TP=2110TPW;',
  'a=ts-refclk:ptp=IEEE1588-2008:00-00-00-00-00-00-00-00:0',
  'a=mediaclk:direct=0',
  'a=mid:backup',
];

const AUDIO_SPEC = {
  type: 'audio',
  redundant: true,
  sessionName: '670ipg',
  origin: { user: 'Evertz', sessId: '0102', sessVer: '23', ip: '10.198.24.151' },
  payloadType: 97,
  port: 1234,
  gmid: '00-02-C5-FF-FE-2E-43-75',
  ptpDomain: 100,
  groupLabels: ['1P', '1S'],
  legs: [
    { mcast: '238.0.139.122', source: '10.198.32.165' },
    { mcast: '238.0.139.116', source: '10.198.64.165' },
  ],
  audio: { encoding: 'L24', rate: 48000, channels: 4, channelOrder: 'SMPTE2110.(SGRP)', ptime: '0.125' },
};

const AUDIO_LINES = [
  'v=0',
  'o=Evertz 0102 23 IN IP4 10.198.24.151',
  's=670ipg',
  't=0 0',
  'a=group:DUP 1P 1S',
  'm=audio 1234 RTP/AVP 97',
  'c=IN IP4 238.0.139.122/64/1',
  'a=ts-refclk:ptp=IEEE1588-2008:00-02-C5-FF-FE-2E-43-75:100',
  'a=rtpmap:97 L24/48000/4',
  'a=source-filter: incl IN IP4 238.0.139.122 10.198.32.165',
  'a=fmtp:97 channel-order=SMPTE2110.(SGRP)',
  'a=ptime:0.125',
  'a=mediaclk:direct=0',
  'a=mid:1P',
  'm=audio 1234 RTP/AVP 97',
  'c=IN IP4 238.0.139.116/64/1',
  'a=ts-refclk:ptp=IEEE1588-2008:00-02-C5-FF-FE-2E-43-75:100',
  'a=rtpmap:97 L24/48000/4',
  'a=source-filter: incl IN IP4 238.0.139.116 10.198.64.165',
  'a=fmtp:97 channel-order=SMPTE2110.(SGRP)',
  'a=ptime:0.125',
  'a=mediaclk:direct=0',
  'a=mid:1S',
];

const ANC_SPEC = {
  type: 'anc',
  redundant: true,
  sessionName: '670ipg',
  origin: { user: 'Evertz', sessId: '0106', sessVer: '23', ip: '10.198.24.151' },
  payloadType: 100,
  port: 1234,
  gmid: '00-02-C5-FF-FE-2E-43-75',
  ptpDomain: 100,
  groupLabels: ['1P', '1S'],
  legs: [
    { mcast: '238.0.139.118', source: '10.198.32.165' },
    { mcast: '238.0.139.112', source: '10.198.64.165' },
  ],
  anc: { vpidCode: 137, didSdids: [] },
};

const ANC_LINES = [
  'v=0',
  'o=Evertz 0106 23 IN IP4 10.198.24.151',
  's=670ipg',
  't=0 0',
  'a=group:DUP 1P 1S',
  'm=video 1234 RTP/AVP 100',
  'c=IN IP4 238.0.139.118/64/1',
  'a=ts-refclk:ptp=IEEE1588-2008:00-02-C5-FF-FE-2E-43-75:100',
  'a=rtpmap:100 smpte291/90000',
  'a=source-filter: incl IN IP4 238.0.139.118 10.198.32.165',
  'a=fmtp:100 VPID_Code=137',
  'a=mediaclk:direct=0',
  'a=mid:1P',
  'm=video 1234 RTP/AVP 100',
  'c=IN IP4 238.0.139.112/64/1',
  'a=ts-refclk:ptp=IEEE1588-2008:00-02-C5-FF-FE-2E-43-75:100',
  'a=rtpmap:100 smpte291/90000',
  'a=source-filter: incl IN IP4 238.0.139.112 10.198.64.165',
  'a=fmtp:100 VPID_Code=137',
  'a=mediaclk:direct=0',
  'a=mid:1S',
];

test('video redundant matches supplied Magnum sample exactly', () => {
  assert.deepEqual(buildSdpLines(VIDEO_SPEC), VIDEO_LINES);
  assert.equal(validateSpec(VIDEO_SPEC).ok, true);
});

test('audio redundant matches supplied Evertz sample exactly', () => {
  assert.deepEqual(buildSdpLines(AUDIO_SPEC), AUDIO_LINES);
  assert.equal(validateSpec(AUDIO_SPEC).ok, true);
});

test('anc redundant matches supplied Evertz sample exactly', () => {
  assert.deepEqual(buildSdpLines(ANC_SPEC), ANC_LINES);
  assert.equal(validateSpec(ANC_SPEC).ok, true);
});

test('SDP text uses CRLF line endings and a trailing CRLF', () => {
  const text = buildSdp(VIDEO_SPEC);
  assert.equal(text, VIDEO_LINES.join(EOL) + EOL);
  assert.ok(text.includes('\r\n'));
});

test('720p59.94 single-path drops group and mid', () => {
  const spec = {
    ...VIDEO_SPEC,
    redundant: false,
    legs: [{ mcast: '238.0.203.15', source: '10.198.34.87' }],
    video: { width: 1280, height: 720 },
  };
  const lines = buildSdpLines(spec);
  assert.ok(!lines.some((l) => l.startsWith('a=group:DUP')));
  assert.ok(!lines.some((l) => l.startsWith('a=mid:')));
  assert.equal(lines.filter((l) => l.startsWith('m=video')).length, 1);
  assert.ok(lines.some((l) => l.includes('width=1280; height=720')));
  assert.equal(validateSpec(spec).ok, true);
});

test('validation rejects bad multicast, source, port, payload, gmid', () => {
  const res = validateSpec({
    type: 'video',
    redundant: false,
    sessionName: 'x',
    origin: { user: 'MAGNUM', sessId: '1', sessVer: '1', ip: '999.1.1.1' },
    payloadType: 20,
    port: 0,
    gmid: 'nope',
    legs: [{ mcast: '10.0.0.1', source: 'bad' }],
  });
  assert.equal(res.ok, false);
  const blob = res.errors.join(' | ');
  assert.match(blob, /origin IP/);
  assert.match(blob, /payload type/);
  assert.match(blob, /port/);
  assert.match(blob, /GMID/);
  assert.match(blob, /multicast/);
  assert.match(blob, /source/);
});

test('redundant spec requires a second leg', () => {
  const res = validateSpec({ ...VIDEO_SPEC, legs: [VIDEO_SPEC.legs[0]] });
  assert.equal(res.ok, false);
  assert.match(res.errors.join(' '), /2 leg\(s\) required/);
});

test('filenames are filesystem-safe and type-suffixed', () => {
  assert.equal(sdpFilename(VIDEO_SPEC), 'DC-0501_ORT-T_0501A_sdp_video.txt');
  assert.equal(sdpFilename(AUDIO_SPEC), '670ipg_audio.txt');
});

test('bulk export filenames are multicast_port.txt', () => {
  assert.equal(exportFilename(VIDEO_SPEC), '238.0.203.15_1234.txt');
  assert.equal(exportFilename(AUDIO_SPEC), '238.0.139.122_1234.txt');
  assert.equal(exportFilename(ANC_SPEC), '238.0.139.118_1234.txt');
});

test('redundant bulk export yields primary+backup filenames with identical SDP body', () => {
  assert.deepEqual(exportFilenames(ANC_SPEC), ['238.0.139.118_1234.txt', '238.0.139.112_1234.txt']);
  const files = bulkExportFiles(ANC_SPEC);
  assert.equal(files.length, 2);
  assert.equal(files[0].name, '238.0.139.118_1234.txt');
  assert.equal(files[1].name, '238.0.139.112_1234.txt');
  assert.equal(files[0].data, files[1].data);
  assert.ok(files[0].data.includes('a=group:DUP'));
  assert.ok(files[0].data.includes('238.0.139.118'));
  assert.ok(files[0].data.includes('238.0.139.112'));
});

test('single-path bulk export yields one filename', () => {
  const single = { ...ANC_SPEC, redundant: false, legs: [ANC_SPEC.legs[0]] };
  assert.deepEqual(exportFilenames(single), ['238.0.139.118_1234.txt']);
  assert.equal(bulkExportFiles(single).length, 1);
});

test('applyBulkOverrides writes plant parameters into the SDP', () => {
  const base = {
    type: 'video',
    redundant: true,
    sessionName: 'keep-me',
    origin: { user: 'X', sessId: '1', sessVer: '1', ip: '1.1.1.1' },
    port: 1234,
    gmid: '00-00-00-00-00-00-00-00',
    ptpDomain: 0,
    groupLabels: ['main', 'backup'],
    legs: [
      { mcast: '238.0.139.123', source: '' },
      { mcast: '238.0.139.117', source: '' },
    ],
    video: { dialect: 'evertz', pm: '2110BPM', tp: '2110TPN' },
  };
  const out = applyBulkOverrides(base, {
    originUser: 'Evertz',
    originIp: '10.198.24.151',
    sessId: '0101',
    sessVer: '23',
    sessionName: '670ipg',
    gmid: '00-02-C5-FF-FE-2E-43-75',
    ptpDomain: 100,
    sourcePrimary: '10.198.32.165',
    sourceSecondary: '10.198.64.165',
    groupLabelA: '1P',
    groupLabelB: '1S',
    videoPm: '2110BPM',
    videoTp: '2110TPN',
  });
  const lines = buildSdpLines(out);
  assert.ok(lines.includes('o=Evertz 0101 23 IN IP4 10.198.24.151'));
  assert.ok(lines.includes('s=670ipg'));
  assert.ok(lines.includes('a=group:DUP 1P 1S'));
  assert.ok(lines.includes('a=source-filter: incl IN IP4 238.0.139.123 10.198.32.165'));
  assert.ok(lines.some((l) => l.includes('00-02-C5-FF-FE-2E-43-75:100')));
  assert.equal(exportFilename(out), '238.0.139.123_1234.txt');
});

test('CSV template round-trips: video row reproduces the sample', () => {
  const { records } = csvToSpecs(csvTemplate());
  assert.equal(records.length, 3);
  const video = records.find((r) => r.spec.type === 'video');
  const audio = records.find((r) => r.spec.type === 'audio');
  const anc = records.find((r) => r.spec.type === 'anc');
  assert.deepEqual(buildSdpLines(video.spec), VIDEO_LINES);
  assert.deepEqual(buildSdpLines(audio.spec), AUDIO_LINES);
  assert.deepEqual(buildSdpLines(anc.spec), ANC_LINES);
  for (const r of records) assert.equal(validateSpec(r.spec).ok, true, r.spec.type);
});

test('CSV parser handles quoted fields containing commas', () => {
  const csv = 'type,session_name\nvideo,"Studio A, PGM"\n';
  const { records } = csvToSpecs(csv);
  assert.equal(records[0].rec.session_name, 'Studio A, PGM');
});

test('makeZip produces a valid stored archive with correct entry count', () => {
  const files = [
    { name: 'video.sdp', data: buildSdp(VIDEO_SPEC) },
    { name: 'audio.sdp', data: buildSdp(AUDIO_SPEC) },
  ];
  const zip = makeZip(files);
  // Local file header signature "PK\x03\x04".
  assert.deepEqual([...zip.slice(0, 4)], [0x50, 0x4b, 0x03, 0x04]);
  // EOCD signature "PK\x05\x06" and record count (2) live in the last 22 bytes.
  const eocd = zip.slice(zip.length - 22);
  assert.deepEqual([...eocd.slice(0, 4)], [0x50, 0x4b, 0x05, 0x06]);
  const total = eocd[10] | (eocd[11] << 8);
  assert.equal(total, 2);
  // Filenames are embedded verbatim.
  const txt = new TextDecoder().decode(zip);
  assert.ok(txt.includes('video.sdp'));
  assert.ok(txt.includes('audio.sdp'));
});

test('crc32 matches the known IEEE check value', () => {
  assert.equal(crc32(new TextEncoder().encode('123456789')) >>> 0, 0xcbf43926);
});

// --- device encap stream-table import -------------------------------------

const ENCAP_CSV = [
  'Device,Media Port,Ethernet,Stream Type,Stream Index,Destination IP,Destination Port,Source IP,Bitrate (Mbps),Backup',
  // Video redundant pair (primary ENET-1/Backup False, secondary ENET-2/Backup True).
  '1007C_SLOT1_OUT,1007C_SLOT1_OUT-VID-INPUT-3,ENET-1,Video,,238.1.1.116,1234,,3000.0,False',
  '1007C_SLOT1_OUT,1007C_SLOT1_OUT-VID-INPUT-3,ENET-2,Video,,238.0.104.8,1234,,3000.0,True',
  // One audio channel-group pair.
  '1007C_SLOT1_OUT,1007C_SLOT1_OUT-VID-INPUT-3,ENET-1,Audio,1,238.57.10.15,1234,,10.0,False',
  '1007C_SLOT1_OUT,1007C_SLOT1_OUT-VID-INPUT-3,ENET-2,Audio,1,238.57.10.16,1234,,10.0,True',
  // ANC single leg only (primary).
  '1007C_SLOT1_OUT,1007C_SLOT1_OUT-VID-INPUT-3,ENET-1,ANC,,238.55.0.205,1234,,10.0,False',
  // Non-2110 rows that must be skipped and counted.
  '1007C_SLOT1_OUT,1007C_SLOT1_OUT-VID-INPUT-3,ENET-2,Full,,238.1.97.51,1234,0.0.0.0,1485.0,True',
  '1007C_SLOT1_OUT,1007C_SLOT1_OUT-VID-INPUT-3,ENET-2,Full (J2K),,238.1.97.46,1234,0.0.0.0,200.0,True',
].join('\n') + '\n';

test('encap header detection distinguishes device export from native template', () => {
  assert.equal(isEncapHeader(['Device', 'Media Port', 'Ethernet', 'Stream Type', 'Stream Index', 'Destination IP', 'Destination Port', 'Source IP', 'Bitrate (Mbps)', 'Backup']), true);
  assert.equal(isEncapHeader(['type', 'session_name', 'mcast_a']), false);
});

test('encap import maps 2110 essences, skips compressed, pairs legs', () => {
  const { specs, skipped, mapped } = encapToSpecs(ENCAP_CSV);
  assert.equal(mapped, 3); // video + one audio + anc
  assert.equal(skipped['Full'], 1);
  assert.equal(skipped['Full (J2K)'], 1);

  const video = specs.find((s) => s.type === 'video');
  const audio = specs.find((s) => s.type === 'audio');
  const anc = specs.find((s) => s.type === 'anc');

  assert.equal(video.redundant, true);
  assert.equal(anc.redundant, false); // only a primary leg present
  assert.equal(audio.sessionName, '1007C_SLOT1_OUT-VID-INPUT-3-A1');

  for (const s of specs) assert.equal(validateSpec(s).ok, true, s.type);
});

test('encap video SDP uses Evertz dialect (1P/1S, BPM/TPN, ts-refclk before rtpmap)', () => {
  const { specs } = encapToSpecs(ENCAP_CSV);
  const video = specs.find((s) => s.type === 'video');
  const lines = buildSdpLines(video);
  assert.ok(!lines.some((l) => l.startsWith('a=source-filter')), 'no source-filter when source is blank');
  assert.equal(lines.filter((l) => l.startsWith('m=video')).length, 2);
  assert.ok(lines.includes('a=group:DUP 1P 1S'));
  assert.ok(lines.includes('a=mid:1P'));
  assert.ok(lines.includes('c=IN IP4 238.1.1.116/64/1'));
  assert.ok(lines.includes('c=IN IP4 238.0.104.8/64/1'));
  assert.ok(lines.some((l) => l.includes('PM=2110BPM') && l.includes('TP=2110TPN')));
  // Evertz attribute order: ts-refclk appears before rtpmap within a media section.
  const m0 = lines.indexOf('m=video 1234 RTP/AVP 96');
  const ts0 = lines.findIndex((l, i) => i > m0 && l.startsWith('a=ts-refclk:'));
  const rtp0 = lines.indexOf('a=rtpmap:96 raw/90000', m0);
  assert.ok(ts0 > m0 && ts0 < rtp0, 'evertz: ts-refclk before rtpmap');
});

test('encap import with overrides reproduces the Magnum Evertz VIDEO SDP exactly', () => {
  const csv = [
    'Device,Media Port,Ethernet,Stream Type,Stream Index,Destination IP,Destination Port,Source IP,Bitrate (Mbps),Backup',
    'BE-106_IPG,BE-106_IPG_E106A01-VID-INPUT-1,ENET-1,Video,,238.0.139.123,1234,,3000.0,False',
    'BE-106_IPG,BE-106_IPG_E106A01-VID-INPUT-1,ENET-2,Video,,238.0.139.117,1234,,3000.0,True',
  ].join('\n') + '\n';

  const { specs } = encapToSpecs(csv, {
    originUser: 'Evertz',
    originIp: '10.198.24.151',
    sessId: '0101',
    sessVer: '23',
    sessionNameTemplate: '670ipg',
    gmid: '00-02-C5-FF-FE-2E-43-75',
    ptpDomain: 100,
    sourcePrimary: '10.198.32.165',
    sourceSecondary: '10.198.64.165',
  });

  const expected = [
    'v=0',
    'o=Evertz 0101 23 IN IP4 10.198.24.151',
    's=670ipg',
    't=0 0',
    'a=group:DUP 1P 1S',
    'm=video 1234 RTP/AVP 96',
    'c=IN IP4 238.0.139.123/64/1',
    'a=ts-refclk:ptp=IEEE1588-2008:00-02-C5-FF-FE-2E-43-75:100',
    'a=rtpmap:96 raw/90000',
    'a=source-filter: incl IN IP4 238.0.139.123 10.198.32.165',
    'a=fmtp:96 sampling=YCbCr-4:2:2; depth=10; width=1920; height=1080; exactframerate=60000/1001; colorimetry=BT709; PM=2110BPM; SSN=ST2110-20:2017; TP=2110TPN; TCS=SDR;',
    'a=mediaclk:direct=0',
    'a=mid:1P',
    'm=video 1234 RTP/AVP 96',
    'c=IN IP4 238.0.139.117/64/1',
    'a=ts-refclk:ptp=IEEE1588-2008:00-02-C5-FF-FE-2E-43-75:100',
    'a=rtpmap:96 raw/90000',
    'a=source-filter: incl IN IP4 238.0.139.117 10.198.64.165',
    'a=fmtp:96 sampling=YCbCr-4:2:2; depth=10; width=1920; height=1080; exactframerate=60000/1001; colorimetry=BT709; PM=2110BPM; SSN=ST2110-20:2017; TP=2110TPN; TCS=SDR;',
    'a=mediaclk:direct=0',
    'a=mid:1S',
  ];
  assert.equal(specs.length, 1);
  assert.deepEqual(buildSdpLines(specs[0]), expected);
  assert.equal(validateSpec(specs[0]).ok, true);
});

test('encap import options override defaults (720p, gmid)', () => {
  const { specs } = encapToSpecs(ENCAP_CSV, { videoPreset: '720p5994', gmid: '00-02-C5-FF-FE-2E-43-75', ptpDomain: 127 });
  const video = specs.find((s) => s.type === 'video');
  const lines = buildSdpLines(video);
  assert.ok(lines.some((l) => l.includes('width=1280; height=720')));
  assert.ok(lines.includes('a=ts-refclk:ptp=IEEE1588-2008:00-02-C5-FF-FE-2E-43-75:127'));
});

test('VIDEO_PRESETS match VPID chips (89CA8001 / 84CA8001) essence fields', () => {
  assert.equal(VIDEO_PRESETS['1080p5994'].vpid, '89CA8001');
  assert.equal(VIDEO_PRESETS['1080p5994hlg'].vpid, '89DAA001');
  assert.equal(applyVideoPreset('1080p5994hlg', {}).tcs, 'HLG');
  assert.equal(applyVideoPreset('1080p5994hlg', {}).colorimetry, 'BT2020');
  assert.equal(VIDEO_PRESETS['2160p5994hlg'].vpid, 'CEDAA001');
  assert.equal(applyVideoPreset('2160p5994hlg', {}).tcs, 'HLG');
  assert.equal(VIDEO_PRESETS['2160p5994pq'].vpid, 'CEEAA001');
  const uhd = applyVideoPreset('2160p5994pq', {});
  assert.equal(uhd.width, 3840);
  assert.equal(uhd.height, 2160);
  assert.equal(uhd.tcs, 'PQ');
  assert.equal(uhd.colorimetry, 'BT2020');
  assert.equal(VIDEO_PRESETS['720p5994'].vpid, '84CA8001');
  const p1080 = applyVideoPreset('1080p5994', {});
  assert.deepEqual(
    { w: p1080.width, h: p1080.height, r: p1080.exactframerate, s: p1080.sampling, d: p1080.depth, t: p1080.tcs, c: p1080.colorimetry },
    { w: 1920, h: 1080, r: '60000/1001', s: 'YCbCr-4:2:2', d: 10, t: 'SDR', c: 'BT709' },
  );
  const p720 = applyVideoPreset('720p5994', { pm: 'keep-me' });
  assert.equal(p720.width, 1280);
  assert.equal(p720.height, 720);
  assert.equal(p720.pm, 'keep-me'); // packing left to caller / dialect
});

test('encap import with overrides reproduces the Magnum ANC SDP exactly', () => {
  // Two ANC legs (primary ENET-1/Backup False, secondary ENET-2/Backup True),
  // matching the real BE-106 IPG flow that Magnum shows.
  const csv = [
    'Device,Media Port,Ethernet,Stream Type,Stream Index,Destination IP,Destination Port,Source IP,Bitrate (Mbps),Backup',
    'BE-106_IPG,BE-106_IPG_E106A01-VID-INPUT-1,ENET-1,ANC,,238.0.139.118,1234,,10.0,False',
    'BE-106_IPG,BE-106_IPG_E106A01-VID-INPUT-1,ENET-2,ANC,,238.0.139.112,1234,,10.0,True',
  ].join('\n') + '\n';

  const { specs } = encapToSpecs(csv, {
    originUser: 'Evertz',
    originIp: '10.198.24.151',
    sessId: '0106',
    sessVer: '23',
    sessionNameTemplate: '670ipg',
    gmid: '00-02-C5-FF-FE-2E-43-75',
    ptpDomain: 100,
    sourcePrimary: '10.198.32.165',
    sourceSecondary: '10.198.64.165',
    ancVpidCode: 137,
  });

  const expected = [
    'v=0',
    'o=Evertz 0106 23 IN IP4 10.198.24.151',
    's=670ipg',
    't=0 0',
    'a=group:DUP 1P 1S',
    'm=video 1234 RTP/AVP 100',
    'c=IN IP4 238.0.139.118/64/1',
    'a=ts-refclk:ptp=IEEE1588-2008:00-02-C5-FF-FE-2E-43-75:100',
    'a=rtpmap:100 smpte291/90000',
    'a=source-filter: incl IN IP4 238.0.139.118 10.198.32.165',
    'a=fmtp:100 VPID_Code=137',
    'a=mediaclk:direct=0',
    'a=mid:1P',
    'm=video 1234 RTP/AVP 100',
    'c=IN IP4 238.0.139.112/64/1',
    'a=ts-refclk:ptp=IEEE1588-2008:00-02-C5-FF-FE-2E-43-75:100',
    'a=rtpmap:100 smpte291/90000',
    'a=source-filter: incl IN IP4 238.0.139.112 10.198.64.165',
    'a=fmtp:100 VPID_Code=137',
    'a=mediaclk:direct=0',
    'a=mid:1S',
  ];
  assert.equal(specs.length, 1);
  assert.deepEqual(buildSdpLines(specs[0]), expected);
  assert.equal(validateSpec(specs[0]).ok, true);
});

test('parseSourceMap + per-device join fills source-filter per device', () => {
  const map = parseSourceMap([
    'key,source_primary,source_secondary',
    'BE-106_IPG,10.198.32.165,10.198.64.165',
    '1007C_SLOT1_OUT,10.198.33.42,10.198.65.42',
  ].join('\n') + '\n');
  assert.deepEqual(map['BE-106_IPG'], { primary: '10.198.32.165', secondary: '10.198.64.165' });

  const csv = [
    'Device,Media Port,Ethernet,Stream Type,Stream Index,Destination IP,Destination Port,Source IP,Bitrate (Mbps),Backup',
    'BE-106_IPG,BE-106_IPG_E106A01-VID-INPUT-1,ENET-1,ANC,,238.0.139.118,1234,,10.0,False',
    'BE-106_IPG,BE-106_IPG_E106A01-VID-INPUT-1,ENET-2,ANC,,238.0.139.112,1234,,10.0,True',
    '1007C_SLOT1_OUT,1007C_SLOT1_OUT-VID-INPUT-3,ENET-1,Video,,238.1.1.116,1234,,3000.0,False',
    '1007C_SLOT1_OUT,1007C_SLOT1_OUT-VID-INPUT-3,ENET-2,Video,,238.0.104.8,1234,,3000.0,True',
  ].join('\n') + '\n';

  const { specs } = encapToSpecs(csv, { sourceMap: map });
  const anc = specs.find((s) => s.type === 'anc');
  const video = specs.find((s) => s.type === 'video');
  assert.ok(buildSdpLines(anc).includes('a=source-filter: incl IN IP4 238.0.139.118 10.198.32.165'));
  assert.ok(buildSdpLines(anc).includes('a=source-filter: incl IN IP4 238.0.139.112 10.198.64.165'));
  assert.ok(buildSdpLines(video).includes('a=source-filter: incl IN IP4 238.1.1.116 10.198.33.42'));
});

test('source map wins over global source override', () => {
  const map = parseSourceMap('key,source_primary,source_secondary\nBE-106_IPG,10.9.9.1,10.9.9.2\n');
  const csv = [
    'Device,Media Port,Ethernet,Stream Type,Stream Index,Destination IP,Destination Port,Source IP,Bitrate (Mbps),Backup',
    'BE-106_IPG,BE-106_IPG_E106A01-VID-INPUT-1,ENET-1,ANC,,238.0.139.118,1234,,10.0,False',
    'OTHER_DEV,OTHER_DEV-VID-INPUT-1,ENET-1,ANC,,238.0.140.10,1234,,10.0,False',
  ].join('\n') + '\n';
  const { specs } = encapToSpecs(csv, { sourceMap: map, sourcePrimary: '10.5.5.5' });
  const mapped = specs.find((s) => s.sessionName.startsWith('BE-106'));
  const fallback = specs.find((s) => s.sessionName.startsWith('OTHER_DEV'));
  assert.ok(buildSdpLines(mapped).includes('a=source-filter: incl IN IP4 238.0.139.118 10.9.9.1'));
  assert.ok(buildSdpLines(fallback).includes('a=source-filter: incl IN IP4 238.0.140.10 10.5.5.5'));
});

test('encap blank source warns ASM and still exports', () => {
  const { specs, warnings, mapped, skipped } = encapToSpecs(ENCAP_CSV);
  assert.equal(mapped, 3);
  assert.equal(skipped['missing source IP (Require SSM)'], undefined);
  const asm = warnings.filter((w) => /ASM/.test(w.message));
  assert.ok(asm.length >= 3, `expected ASM warns for video/audio/anc, got ${asm.length}`);
  assert.ok(asm.every((w) => /Source blank → ASM|Backup source blank → ASM/.test(w.message)));
  const incomplete = warnings.filter((w) => /2022-7 incomplete/.test(w.message));
  assert.equal(incomplete.length, 1, 'ANC single-leg should warn once');
  assert.match(incomplete[0].message, /backup missing/);
  for (const s of specs) {
    assert.equal(validateSpec(s).ok, true);
    assert.ok(!buildSdpLines(s).some((l) => l.startsWith('a=source-filter')));
  }
});

test('encap blank/invalid destination port is hard-skipped', () => {
  const csv = [
    'Device,Media Port,Ethernet,Stream Type,Stream Index,Destination IP,Destination Port,Source IP,Bitrate (Mbps),Backup',
    'DEV,VID-1,ENET-1,Video,,238.1.1.116,,10.1.1.1,3000.0,False',
    'DEV,VID-1,ENET-1,Audio,1,238.1.1.117,0,10.1.1.1,10.0,False',
    'DEV,VID-1,ENET-1,ANC,,238.1.1.118,abc,10.1.1.1,10.0,False',
    'DEV,VID-1,ENET-1,Video,,238.1.1.119,1234,10.1.1.1,3000.0,False',
  ].join('\n') + '\n';
  const { specs, skipped, skippedRows, mapped } = encapToSpecs(csv);
  assert.equal(mapped, 1);
  assert.equal(specs[0].port, 1234);
  // Video recovers via the valid second row; audio+anc have no usable leg → not in ZIP.
  assert.equal(skipped['essence not exported (no usable multicast)'], 2);
  assert.equal(skippedRows.length, 2);
  assert.ok(skippedRows.every((r) => /^Not exported —/.test(r.message)));
  assert.ok(skippedRows.every((r) => /port blank|port "/.test(r.message) || /Destination Port|port/.test(r.message)));
});

test('cleared backup multicast warns but file still exported', () => {
  const csv = [
    'Device,Media Port,Ethernet,Stream Type,Stream Index,Destination IP,Destination Port,Source IP,Bitrate (Mbps),Backup',
    'DEV,VID-1,ENET-1,Video,,238.1.1.116,1234,10.1.1.1,3000.0,False',
    'DEV,VID-1,ENET-2,Video,,,1234,10.1.1.2,3000.0,True',
  ].join('\n') + '\n';
  const { specs, skippedRows, warnings, mapped } = encapToSpecs(csv);
  assert.equal(mapped, 1);
  assert.equal(specs[0].redundant, false);
  assert.equal(skippedRows.length, 0, 'still in ZIP — bad leg is a warning, not Not-exported');
  const w = warnings.find((x) => /2022-7 incomplete/.test(x.message));
  assert.ok(w, 'expected incomplete-pair warning tied to cleared multicast');
  assert.match(w.message, /backup: IP blank/);
  assert.match(w.message, /Single-path from primary \(238\.1\.1\.116\)/);
  assert.deepEqual(w.exported, ['238.1.1.116_1234.txt']);
  assert.match(w.skipped[0], /backup IP blank/);
  assert.match(w.skipped[0], /238\.1\.1\.116/);
});

test('cleared primary with valid backup still exports one file', () => {
  const csv = [
    'Device,Media Port,Ethernet,Stream Type,Stream Index,Destination IP,Destination Port,Source IP,Bitrate (Mbps),Backup',
    'BE-106_IPG_E106A01,BE-106_IPG_E106A01-VID-INPUT-1,ENET-1,ANC,,,1234,,10.0,False',
    'BE-106_IPG_E106A01,BE-106_IPG_E106A01-VID-INPUT-1,ENET-2,ANC,,238.0.139.112,1234,,10.0,True',
  ].join('\n') + '\n';
  const { specs, skippedRows, warnings, mapped } = encapToSpecs(csv);
  assert.equal(mapped, 1);
  assert.equal(skippedRows.length, 0);
  assert.equal(specs[0].legs[0].mcast, '238.0.139.112');
  const w = warnings.find((x) => /2022-7 incomplete/.test(x.message));
  assert.ok(w);
  assert.match(w.message, /primary: IP blank/);
  assert.match(w.message, /Single-path from backup \(238\.0\.139\.112\)/);
  assert.deepEqual(w.exported, ['238.0.139.112_1234.txt']);
  assert.match(w.skipped[0], /primary IP blank/);
  assert.match(w.skipped[0], /238\.0\.139\.112/);
});

test('blanked primary port names skipped multicast file', () => {
  const csv = [
    'Device,Media Port,Ethernet,Stream Type,Stream Index,Destination IP,Destination Port,Source IP,Bitrate (Mbps),Backup',
    'DEV,VID-1,ENET-1,Audio,2,238.0.139.121,,10.1.1.1,10.0,False',
    'DEV,VID-1,ENET-2,Audio,2,238.0.139.115,1234,10.1.1.2,10.0,True',
  ].join('\n') + '\n';
  const { specs, skippedRows, warnings, mapped } = encapToSpecs(csv);
  assert.equal(mapped, 1);
  assert.equal(skippedRows.length, 0);
  assert.equal(specs[0].legs[0].mcast, '238.0.139.115');
  const w = warnings.find((x) => /2022-7 incomplete/.test(x.message));
  assert.ok(w);
  assert.deepEqual(w.exported, ['238.0.139.115_1234.txt']);
  assert.deepEqual(w.skipped, ['238.0.139.121_1234.txt']);
});

test('sessionNameTemplate {device} survives applyBulkOverrides (packageSpecs path)', () => {
  const csv = [
    'Device,Media Port,Ethernet,Stream Type,Stream Index,Destination IP,Destination Port,Source IP,Bitrate (Mbps),Backup',
    '1007C_SLOT1_OUT,1007C_SLOT1_OUT-VID-INPUT-3,ENET-1,Video,,238.1.1.116,1234,10.1.1.1,3000.0,False',
    '1007C_SLOT1_OUT,1007C_SLOT1_OUT-VID-INPUT-3,ENET-2,Video,,238.0.104.8,1234,10.1.1.2,3000.0,True',
  ].join('\n') + '\n';
  const opts = {
    sessionNameTemplate: '{device}',
    videoPreset: '1080p5994',
    originUser: 'Evertz',
    originIp: '10.198.24.151',
    gmid: '00-02-C5-FF-FE-2E-43-75',
    ptpDomain: 100,
    pairLegs: true,
  };
  const { specs } = encapToSpecs(csv, opts);
  assert.equal(specs[0].sessionName, '1007C_SLOT1_OUT');
  const again = applyBulkOverrides(specs[0], opts);
  assert.equal(again.sessionName, '1007C_SLOT1_OUT');
  assert.equal(validateSpec(again).ok, true);
  const typed = applyBulkOverrides(specs[0], { ...opts, sessionNameTemplate: '{device}_{type}' });
  assert.equal(typed.sessionName, '1007C_SLOT1_OUT_video');
});

test('backup-only 2022-7 binds secondary SSM source to kept mcast', () => {
  const csv = [
    'Device,Media Port,Ethernet,Stream Type,Stream Index,Destination IP,Destination Port,Source IP,Bitrate (Mbps),Backup',
    'DEV,VID-1,ENET-1,Video,,,1234,,3000.0,False',
    'DEV,VID-1,ENET-2,Video,,238.0.139.117,1234,10.198.64.165,3000.0,True',
  ].join('\n') + '\n';
  const { specs } = encapToSpecs(csv, {
    sourcePrimary: '10.198.32.165',
    sourceSecondary: '10.198.64.165',
    videoPreset: '1080p5994',
    originUser: 'Evertz',
    originIp: '10.1.1.1',
    gmid: '00-02-C5-FF-FE-2E-43-75',
    ptpDomain: 100,
    pairLegs: true,
  });
  assert.equal(specs.length, 1);
  assert.equal(specs[0].legs[0].mcast, '238.0.139.117');
  assert.equal(specs[0].legs[0].source, '10.198.64.165');
  assert.ok(buildSdpLines(specs[0]).includes(
    'a=source-filter: incl IN IP4 238.0.139.117 10.198.64.165',
  ));
});

test('pairLegs false exports primary and backup as two single-path specs', () => {
  const csv = [
    'Device,Media Port,Ethernet,Stream Type,Stream Index,Destination IP,Destination Port,Source IP,Bitrate (Mbps),Backup',
    'DEV,VID-1,ENET-1,Video,,238.1.1.116,1234,10.1.1.1,3000.0,False',
    'DEV,VID-1,ENET-2,Video,,238.0.104.8,1234,10.1.1.2,3000.0,True',
  ].join('\n') + '\n';
  const { specs, warnings } = encapToSpecs(csv, {
    pairLegs: false,
    videoPreset: '1080p5994',
    originUser: 'Evertz',
    originIp: '10.1.1.1',
    gmid: '00-02-C5-FF-FE-2E-43-75',
    ptpDomain: 100,
  });
  assert.equal(specs.length, 2);
  assert.equal(specs[0].redundant, false);
  assert.equal(specs[1].redundant, false);
  assert.equal(specs[0].legs[0].mcast, '238.1.1.116');
  assert.equal(specs[1].legs[0].mcast, '238.0.104.8');
  assert.deepEqual(exportFilenames(specs[0]), ['238.1.1.116_1234.txt']);
  assert.deepEqual(exportFilenames(specs[1]), ['238.0.104.8_1234.txt']);
  assert.equal(warnings.length, 0);
});

test('pairLegs false + dual Source IP: backup SDP keeps secondary SSM (packageSpecs path)', () => {
  // Regresses: applyBulkOverrides stamped sourcePrimary on every legs[0], so the
  // backup single-path file got 1.2.3.4 instead of 5.6.7.8.
  const csv = [
    'Device,Media Port,Ethernet,Stream Type,Stream Index,Destination IP,Destination Port,Source IP,Bitrate (Mbps),Backup',
    'DEV,VID-1,ENET-1,Video,,238.0.140.11,1234,10.198.32.16,3000.0,False',
    'DEV,VID-1,ENET-2,Video,,238.0.140.12,1234,10.198.64.16,3000.0,True',
  ].join('\n') + '\n';
  const opts = {
    pairLegs: false,
    sourcePrimary: '1.2.3.4',
    sourceSecondary: '5.6.7.8',
    videoPreset: '1080p5994',
    originUser: 'Evertz',
    originIp: '10.1.1.1',
    gmid: '00-02-C5-FF-FE-2E-43-75',
    ptpDomain: 100,
  };
  const { specs } = encapToSpecs(csv, opts);
  assert.equal(specs.length, 2);
  assert.equal(specs[0].legRole, 'primary');
  assert.equal(specs[1].legRole, 'backup');
  const primary = applyBulkOverrides(specs[0], opts);
  const backup = applyBulkOverrides(specs[1], opts);
  assert.equal(primary.legs[0].source, '1.2.3.4');
  assert.equal(backup.legs[0].source, '5.6.7.8');
  assert.ok(buildSdpLines(primary).includes('a=source-filter: incl IN IP4 238.0.140.11 1.2.3.4'));
  assert.ok(buildSdpLines(backup).includes('a=source-filter: incl IN IP4 238.0.140.12 5.6.7.8'));
});

test('same multicast on both 2022-7 legs still yields two ZIP names', () => {
  const spec = {
    type: 'anc',
    redundant: true,
    sessionName: 'x',
    origin: { user: 'Evertz', sessId: '1', sessVer: '1', ip: '10.1.1.1' },
    port: 1234,
    gmid: '00-02-C5-FF-FE-2E-43-75',
    ptpDomain: 100,
    groupLabels: ['1P', '1S'],
    legs: [
      { mcast: '238.1.1.1', source: '10.1.1.1' },
      { mcast: '238.1.1.1', source: '10.1.1.2' },
    ],
    anc: { vpidCode: '', didSdids: [] },
  };
  assert.deepEqual(exportFilenames(spec), ['238.1.1.1_1234.txt', '238.1.1.1_1234_b.txt']);
  const files = bulkExportFiles(spec);
  assert.equal(files.length, 2);
  assert.equal(files[0].data, files[1].data);
  assert.ok(files[0].data.includes('a=group:DUP'));
});
