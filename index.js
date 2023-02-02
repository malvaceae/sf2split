// Node.js Core Modules
const fs = require('fs');

// filename
const [_, __, filename] = process.argv;

if (!filename) {
  throw Error();
}

// sf2
const sf2 = fs.readFileSync(filename);

// chunks
const [smpl, phdr, pbag, pmod, pgen, inst, ibag, imod, igen, shdr] = (() => {
  const chunks = [];

  for (let i = 0; i <= (sf2.length - 8); i += 8) {
    switch (sf2.toString('utf8', i, i + 4)) {
      case 'RIFF':
      case 'LIST':
        i += 4;
        continue;
      case 'smpl':
      case 'phdr':
      case 'pbag':
      case 'pmod':
      case 'pgen':
      case 'inst':
      case 'ibag':
      case 'imod':
      case 'igen':
      case 'shdr':
        chunks.push(sf2.subarray(i + 8, i + 8 + sf2.readUInt32LE(i + 4)));
    }

    i += sf2.readUInt32LE(i + 4);
  }

  return chunks;
})();

// phdr list
const phdrList = [...Array(phdr.length / 38).keys()].map((i) => {
  return phdr.subarray(i * 38, i * 38 + 38);
});

// pbag list
const pbagList = [...Array(pbag.length / 4).keys()].map((i) => {
  return pbag.subarray(i * 4, i * 4 + 4);
});

// pmod list
const pmodList = [...Array(pmod.length / 10).keys()].map((i) => {
  return pmod.subarray(i * 10, i * 10 + 10);
});

// pgen list
const pgenList = [...Array(pgen.length / 4).keys()].map((i) => {
  return pgen.subarray(i * 4, i * 4 + 4);
});

// inst list
const instList = [...Array(inst.length / 22).keys()].map((i) => {
  return inst.subarray(i * 22, i * 22 + 22);
});

// ibag list
const ibagList = [...Array(ibag.length / 4).keys()].map((i) => {
  return ibag.subarray(i * 4, i * 4 + 4);
});

// imod list
const imodList = [...Array(imod.length / 10).keys()].map((i) => {
  return imod.subarray(i * 10, i * 10 + 10);
});

// igen list
const igenList = [...Array(igen.length / 4).keys()].map((i) => {
  return igen.subarray(i * 4, i * 4 + 4);
});

// shdr list
const shdrList = [...Array(shdr.length / 46).keys()].map((i) => {
  return shdr.subarray(i * 46, i * 46 + 46);
});

// smpl list
const smplList = shdrList.map((shdr) => {
  return smpl.subarray(
    shdr.readUInt32LE(20) * 2,
    shdr.readUInt32LE(24) * 2,
  );
});

// normalize names
phdrList.forEach((phdr) => phdr.fill(0, phdr.indexOf(0), 20));
instList.forEach((inst) => inst.fill(0, inst.indexOf(0), 20));
shdrList.forEach((shdr) => shdr.fill(0, shdr.indexOf(0), 20));

// create dist directory
fs.mkdirSync('dist', {
  recursive: true,
});

// write sf2 files
[...Array(phdrList.length).keys()].filter((i) => phdrList[i].indexOf('EOP')).forEach((i) => {
  // name
  const name = phdrList[i].subarray(0, Math.ceil(phdrList[i].indexOf(0) / 2 + .5) * 2);

  // pbag points
  const pbagPoints = [
    phdrList[i + 0].readUInt16LE(24),
    phdrList[i + 1].readUInt16LE(24),
  ];

  // pmod points
  const pmodPoints = [
    pbagList[pbagPoints[0]].readUInt16LE(2),
    pbagList[pbagPoints[1]].readUInt16LE(2),
  ];

  // pgen points
  const pgenPoints = [
    pbagList[pbagPoints[0]].readUInt16LE(0),
    pbagList[pbagPoints[1]].readUInt16LE(0),
  ];

  // inst ids
  const instIds = [...new Set(pgenList.slice(pgenPoints[0], pgenPoints[1]).flatMap((pgen) => {
    if (pgen.readUInt16LE(0) === 41) {
      return [pgen.readUInt16LE(2)];
    } else {
      return [];
    }
  }))];

  // sort inst ids
  instIds.sort((a, b) => a - b);

  // ibag points
  const ibagPoints = instIds.map((id) => {
    return [
      instList[id + 0].readUInt16LE(20),
      instList[id + 1].readUInt16LE(20),
    ];
  });

  // imod points
  const imodPoints = ibagPoints.map((ibagPoints) => {
    return [
      ibagList[ibagPoints[0]].readUInt16LE(2),
      ibagList[ibagPoints[1]].readUInt16LE(2),
    ];
  });

  // igen points
  const igenPoints = ibagPoints.map((ibagPoints) => {
    return [
      ibagList[ibagPoints[0]].readUInt16LE(0),
      ibagList[ibagPoints[1]].readUInt16LE(0),
    ];
  });

  // smpl ids
  const smplIds = [...new Set(igenPoints.flatMap((igenPoints) => igenList.slice(igenPoints[0], igenPoints[1])).flatMap((igen) => {
    if (igen.readUInt16LE(0) === 53) {
      return [igen.readUInt16LE(2)];
    } else {
      return [];
    }
  }))];

  // sort smpl ids
  smplIds.sort((a, b) => a - b);

  // ifil
  const ifil = Uint8Array.from([
    0x69, // i
    0x66, // f
    0x69, // i
    0x6C, // l
    0x04,
    0x00,
    0x00,
    0x00,
    0x02,
    0x00,
    0x01,
    0x00,
  ]);

  // isng
  const isng = Uint8Array.from([
    0x69, // i
    0x73, // s
    0x6E, // n
    0x67, // g
    0x08,
    0x00,
    0x00,
    0x00,
    0x45, // E
    0x4D, // M
    0x55, // U
    0x38, // 8
    0x30, // 0
    0x30, // 0
    0x30, // 0
    0x00,
  ]);

  // inam
  const inam = Buffer.concat([
    Uint8Array.from([
      0x49, // I
      0x4E, // N
      0x41, // A
      0x4D, // M
      (name.length & 0x000000FF) >> 0x00,
      (name.length & 0x0000FF00) >> 0x08,
      (name.length & 0x00FF0000) >> 0x10,
      (name.length & 0xFF000000) >> 0x18,
    ]),
    name,
  ]);

  // info
  const info = Buffer.concat([
    Uint8Array.from([
      0x4C, // L
      0x49, // I
      0x53, // S
      0x54, // T
      (ifil.length + isng.length + inam.length + 4 & 0x000000FF) >> 0x00,
      (ifil.length + isng.length + inam.length + 4 & 0x0000FF00) >> 0x08,
      (ifil.length + isng.length + inam.length + 4 & 0x00FF0000) >> 0x10,
      (ifil.length + isng.length + inam.length + 4 & 0xFF000000) >> 0x18,
      0x49, // I
      0x4E, // N
      0x46, // F
      0x4F, // O
    ]),
    ifil,
    isng,
    inam,
  ]);

  // smpl
  const smpl = Buffer.concat([
    Uint8Array.from([
      0x73, // s
      0x6D, // m
      0x70, // p
      0x6C, // l
      (smplIds.reduce((sum, id) => sum + smplList[id].length, 0) + smplIds.length * 46 & 0x000000FF) >> 0x00,
      (smplIds.reduce((sum, id) => sum + smplList[id].length, 0) + smplIds.length * 46 & 0x0000FF00) >> 0x08,
      (smplIds.reduce((sum, id) => sum + smplList[id].length, 0) + smplIds.length * 46 & 0x00FF0000) >> 0x10,
      (smplIds.reduce((sum, id) => sum + smplList[id].length, 0) + smplIds.length * 46 & 0xFF000000) >> 0x18,
    ]),
    ...smplIds.flatMap((id) => [smplList[id], new Uint8Array(46)]),
  ]);

  // sdta
  const sdta = Buffer.concat([
    Uint8Array.from([
      0x4C, // L
      0x49, // I
      0x53, // S
      0x54, // T
      (smpl.length + 4 & 0x000000FF) >> 0x00,
      (smpl.length + 4 & 0x0000FF00) >> 0x08,
      (smpl.length + 4 & 0x00FF0000) >> 0x10,
      (smpl.length + 4 & 0xFF000000) >> 0x18,
      0x73, // s
      0x64, // d
      0x74, // t
      0x61, // a
    ]),
    smpl,
  ]);

  // phdr
  const phdr = Buffer.concat([
    Uint8Array.from([
      0x70, // p
      0x68, // h
      0x64, // d
      0x72, // r
      (phdrList[i].length + 38 & 0x000000FF) >> 0x00,
      (phdrList[i].length + 38 & 0x0000FF00) >> 0x08,
      (phdrList[i].length + 38 & 0x00FF0000) >> 0x10,
      (phdrList[i].length + 38 & 0xFF000000) >> 0x18,
    ]),
    Uint8Array.from([
      phdrList[i][0],
      phdrList[i][1],
      phdrList[i][2],
      phdrList[i][3],
      phdrList[i][4],
      phdrList[i][5],
      phdrList[i][6],
      phdrList[i][7],
      phdrList[i][8],
      phdrList[i][9],
      phdrList[i][10],
      phdrList[i][11],
      phdrList[i][12],
      phdrList[i][13],
      phdrList[i][14],
      phdrList[i][15],
      phdrList[i][16],
      phdrList[i][17],
      phdrList[i][18],
      phdrList[i][19],
      phdrList[i][20],
      phdrList[i][21],
      phdrList[i][22],
      phdrList[i][23],
      0x00,
      0x00,
      phdrList[i][26],
      phdrList[i][27],
      phdrList[i][28],
      phdrList[i][29],
      phdrList[i][30],
      phdrList[i][31],
      phdrList[i][32],
      phdrList[i][33],
      phdrList[i][34],
      phdrList[i][35],
      phdrList[i][36],
      phdrList[i][37],
    ]),
    Uint8Array.from([
      0x45, // E
      0x4F, // O
      0x50, // P
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      (pbagPoints[1] - pbagPoints[0] & 0x00FF) >> 0x00,
      (pbagPoints[1] - pbagPoints[0] & 0xFF00) >> 0x08,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
    ]),
  ]);

  // pbag
  const pbag = Buffer.concat([
    Uint8Array.from([
      0x70, // p
      0x62, // b
      0x61, // a
      0x67, // g
      ((pbagPoints[1] - pbagPoints[0]) * 4 + 4 & 0x000000FF) >> 0x00,
      ((pbagPoints[1] - pbagPoints[0]) * 4 + 4 & 0x0000FF00) >> 0x08,
      ((pbagPoints[1] - pbagPoints[0]) * 4 + 4 & 0x00FF0000) >> 0x10,
      ((pbagPoints[1] - pbagPoints[0]) * 4 + 4 & 0xFF000000) >> 0x18,
    ]),
    ...pbagList.slice(pbagPoints[0], pbagPoints[1]).map((pbag) => {
      return Uint8Array.from([
        (pbag.readUInt16LE(0) - pbagList[pbagPoints[0]].readUInt16LE(0) & 0x00FF) >> 0x00,
        (pbag.readUInt16LE(0) - pbagList[pbagPoints[0]].readUInt16LE(0) & 0xFF00) >> 0x08,
        (pbag.readUInt16LE(2) - pbagList[pbagPoints[0]].readUInt16LE(2) & 0x00FF) >> 0x00,
        (pbag.readUInt16LE(2) - pbagList[pbagPoints[0]].readUInt16LE(2) & 0xFF00) >> 0x08,
      ]);
    }),
    Uint8Array.from([
      (pgenPoints[1] - pgenPoints[0] & 0x00FF) >> 0x00,
      (pgenPoints[1] - pgenPoints[0] & 0xFF00) >> 0x08,
      (pmodPoints[1] - pmodPoints[0] & 0x00FF) >> 0x00,
      (pmodPoints[1] - pmodPoints[0] & 0xFF00) >> 0x08,
    ]),
  ]);

  // pmod
  const pmod = Buffer.concat([
    Uint8Array.from([
      0x70, // p
      0x6D, // m
      0x6F, // o
      0x64, // d
      ((pmodPoints[1] - pmodPoints[0]) * 10 + 10 & 0x000000FF) >> 0x00,
      ((pmodPoints[1] - pmodPoints[0]) * 10 + 10 & 0x0000FF00) >> 0x08,
      ((pmodPoints[1] - pmodPoints[0]) * 10 + 10 & 0x00FF0000) >> 0x10,
      ((pmodPoints[1] - pmodPoints[0]) * 10 + 10 & 0xFF000000) >> 0x18,
    ]),
    ...pmodList.slice(pmodPoints[0], pmodPoints[1]),
    Uint8Array.from([
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
    ]),
  ]);

  // pgen
  const pgen = Buffer.concat([
    Uint8Array.from([
      0x70, // p
      0x67, // g
      0x65, // e
      0x6E, // n
      ((pgenPoints[1] - pgenPoints[0]) * 4 + 4 & 0x000000FF) >> 0x00,
      ((pgenPoints[1] - pgenPoints[0]) * 4 + 4 & 0x0000FF00) >> 0x08,
      ((pgenPoints[1] - pgenPoints[0]) * 4 + 4 & 0x00FF0000) >> 0x10,
      ((pgenPoints[1] - pgenPoints[0]) * 4 + 4 & 0xFF000000) >> 0x18,
    ]),
    ...pgenList.slice(pgenPoints[0], pgenPoints[1]).map((pgen) => {
      if (pgen.readUInt16LE(0) === 41) {
        return Uint8Array.from([
          pgen[0],
          pgen[1],
          (instIds.indexOf(pgen.readUInt16LE(2)) & 0x00FF) >> 0x00,
          (instIds.indexOf(pgen.readUInt16LE(2)) & 0xFF00) >> 0x08,
        ]);
      } else {
        return pgen;
      }
    }),
    Uint8Array.from([
      0x00,
      0x00,
      0x00,
      0x00,
    ]),
  ]);

  // inst
  const inst = Buffer.concat([
    Uint8Array.from([
      0x69, // i
      0x6E, // n
      0x73, // s
      0x74, // t
      (instIds.length * 22 + 22 & 0x000000FF) >> 0x00,
      (instIds.length * 22 + 22 & 0x0000FF00) >> 0x08,
      (instIds.length * 22 + 22 & 0x00FF0000) >> 0x10,
      (instIds.length * 22 + 22 & 0xFF000000) >> 0x18,
    ]),
    ...instIds.map((id) => instList[id]).map((inst, i) => {
      return Uint8Array.from([
        inst[0],
        inst[1],
        inst[2],
        inst[3],
        inst[4],
        inst[5],
        inst[6],
        inst[7],
        inst[8],
        inst[9],
        inst[10],
        inst[11],
        inst[12],
        inst[13],
        inst[14],
        inst[15],
        inst[16],
        inst[17],
        inst[18],
        inst[19],
        (ibagPoints.slice(0, i).reduce((sum, ibagPoints) => sum + (ibagPoints[1] - ibagPoints[0]), 0) & 0x00FF) >> 0x00,
        (ibagPoints.slice(0, i).reduce((sum, ibagPoints) => sum + (ibagPoints[1] - ibagPoints[0]), 0) & 0xFF00) >> 0x08,
      ]);
    }),
    Uint8Array.from([
      0x45, // E
      0x4F, // O
      0x49, // I
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      (ibagPoints.reduce((sum, ibagPoints) => sum + (ibagPoints[1] - ibagPoints[0]), 0) & 0x00FF) >> 0x00,
      (ibagPoints.reduce((sum, ibagPoints) => sum + (ibagPoints[1] - ibagPoints[0]), 0) & 0xFF00) >> 0x08,
    ]),
  ]);

  // ibag
  const ibag = Buffer.concat([
    Uint8Array.from([
      0x69, // i
      0x62, // b
      0x61, // a
      0x67, // g
      (ibagPoints.reduce((sum, ibagPoints) => sum + (ibagPoints[1] - ibagPoints[0]), 0) * 4 + 4 & 0x000000FF) >> 0x00,
      (ibagPoints.reduce((sum, ibagPoints) => sum + (ibagPoints[1] - ibagPoints[0]), 0) * 4 + 4 & 0x0000FF00) >> 0x08,
      (ibagPoints.reduce((sum, ibagPoints) => sum + (ibagPoints[1] - ibagPoints[0]), 0) * 4 + 4 & 0x00FF0000) >> 0x10,
      (ibagPoints.reduce((sum, ibagPoints) => sum + (ibagPoints[1] - ibagPoints[0]), 0) * 4 + 4 & 0xFF000000) >> 0x18,
    ]),
    ...ibagPoints.flatMap((ibagPoints, i) => ibagList.slice(ibagPoints[0], ibagPoints[1]).map((ibag) => {
      return Uint8Array.from([
        (igenPoints.slice(0, i).reduce((sum, igenPoints) => sum + (igenPoints[1] - igenPoints[0]), 0) + (ibag.readUInt16LE(0) - ibagList[ibagPoints[0]].readUInt16LE(0)) & 0x00FF) >> 0x00,
        (igenPoints.slice(0, i).reduce((sum, igenPoints) => sum + (igenPoints[1] - igenPoints[0]), 0) + (ibag.readUInt16LE(0) - ibagList[ibagPoints[0]].readUInt16LE(0)) & 0xFF00) >> 0x08,
        (imodPoints.slice(0, i).reduce((sum, imodPoints) => sum + (imodPoints[1] - imodPoints[0]), 0) + (ibag.readUInt16LE(2) - ibagList[ibagPoints[0]].readUInt16LE(2)) & 0x00FF) >> 0x00,
        (imodPoints.slice(0, i).reduce((sum, imodPoints) => sum + (imodPoints[1] - imodPoints[0]), 0) + (ibag.readUInt16LE(2) - ibagList[ibagPoints[0]].readUInt16LE(2)) & 0xFF00) >> 0x08,
      ]);
    })),
    Uint8Array.from([
      (igenPoints.reduce((sum, igenPoints) => sum + (igenPoints[1] - igenPoints[0]), 0) & 0x00FF) >> 0x00,
      (igenPoints.reduce((sum, igenPoints) => sum + (igenPoints[1] - igenPoints[0]), 0) & 0xFF00) >> 0x08,
      (imodPoints.reduce((sum, imodPoints) => sum + (imodPoints[1] - imodPoints[0]), 0) & 0x00FF) >> 0x00,
      (imodPoints.reduce((sum, imodPoints) => sum + (imodPoints[1] - imodPoints[0]), 0) & 0xFF00) >> 0x08,
    ]),
  ]);

  // imod
  const imod = Buffer.concat([
    Uint8Array.from([
      0x69, // i
      0x6D, // m
      0x6F, // o
      0x64, // d
      (imodPoints.reduce((sum, imodPoints) => sum + (imodPoints[1] - imodPoints[0]), 0) * 10 + 10 & 0x000000FF) >> 0x00,
      (imodPoints.reduce((sum, imodPoints) => sum + (imodPoints[1] - imodPoints[0]), 0) * 10 + 10 & 0x0000FF00) >> 0x08,
      (imodPoints.reduce((sum, imodPoints) => sum + (imodPoints[1] - imodPoints[0]), 0) * 10 + 10 & 0x00FF0000) >> 0x10,
      (imodPoints.reduce((sum, imodPoints) => sum + (imodPoints[1] - imodPoints[0]), 0) * 10 + 10 & 0xFF000000) >> 0x18,
    ]),
    ...imodPoints.flatMap((imodPoints) => imodList.slice(imodPoints[0], imodPoints[1])),
    Uint8Array.from([
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
    ]),
  ]);

  // igen
  const igen = Buffer.concat([
    Uint8Array.from([
      0x69, // i
      0x67, // g
      0x65, // e
      0x6E, // n
      (igenPoints.reduce((sum, igenPoints) => sum + (igenPoints[1] - igenPoints[0]), 0) * 4 + 4 & 0x000000FF) >> 0x00,
      (igenPoints.reduce((sum, igenPoints) => sum + (igenPoints[1] - igenPoints[0]), 0) * 4 + 4 & 0x0000FF00) >> 0x08,
      (igenPoints.reduce((sum, igenPoints) => sum + (igenPoints[1] - igenPoints[0]), 0) * 4 + 4 & 0x00FF0000) >> 0x10,
      (igenPoints.reduce((sum, igenPoints) => sum + (igenPoints[1] - igenPoints[0]), 0) * 4 + 4 & 0xFF000000) >> 0x18,
    ]),
    ...igenPoints.flatMap((igenPoints) => igenList.slice(igenPoints[0], igenPoints[1]).map((igen) => {
      if (igen.readUInt16LE(0) === 53) {
        return Uint8Array.from([
          igen[0],
          igen[1],
          (smplIds.indexOf(igen.readUInt16LE(2)) & 0x00FF) >> 0x00,
          (smplIds.indexOf(igen.readUInt16LE(2)) & 0xFF00) >> 0x08,
        ]);
      } else {
        return igen;
      }
    })),
    Uint8Array.from([
      0x00,
      0x00,
      0x00,
      0x00,
    ]),
  ]);

  // shdr
  const shdr = Buffer.concat([
    Uint8Array.from([
      0x73, // s
      0x68, // h
      0x64, // d
      0x72, // r
      (smplIds.length * 46 + 46 & 0x000000FF) >> 0x00,
      (smplIds.length * 46 + 46 & 0x0000FF00) >> 0x08,
      (smplIds.length * 46 + 46 & 0x00FF0000) >> 0x10,
      (smplIds.length * 46 + 46 & 0xFF000000) >> 0x18,
    ]),
    ...smplIds.map((id) => shdrList[id]).map((shdr, i) => {
      return Uint8Array.from([
        shdr[0],
        shdr[1],
        shdr[2],
        shdr[3],
        shdr[4],
        shdr[5],
        shdr[6],
        shdr[7],
        shdr[8],
        shdr[9],
        shdr[10],
        shdr[11],
        shdr[12],
        shdr[13],
        shdr[14],
        shdr[15],
        shdr[16],
        shdr[17],
        shdr[18],
        shdr[19],
        ((smplIds.slice(0, i).reduce((sum, id) => sum + smplList[id].length, 0) + i * 46) / 2 + shdr.readUInt32LE(20) - shdr.readUInt32LE(20) & 0x000000FF) >> 0x00,
        ((smplIds.slice(0, i).reduce((sum, id) => sum + smplList[id].length, 0) + i * 46) / 2 + shdr.readUInt32LE(20) - shdr.readUInt32LE(20) & 0x0000FF00) >> 0x08,
        ((smplIds.slice(0, i).reduce((sum, id) => sum + smplList[id].length, 0) + i * 46) / 2 + shdr.readUInt32LE(20) - shdr.readUInt32LE(20) & 0x00FF0000) >> 0x10,
        ((smplIds.slice(0, i).reduce((sum, id) => sum + smplList[id].length, 0) + i * 46) / 2 + shdr.readUInt32LE(20) - shdr.readUInt32LE(20) & 0xFF000000) >> 0x18,
        ((smplIds.slice(0, i).reduce((sum, id) => sum + smplList[id].length, 0) + i * 46) / 2 + shdr.readUInt32LE(24) - shdr.readUInt32LE(20) & 0x000000FF) >> 0x00,
        ((smplIds.slice(0, i).reduce((sum, id) => sum + smplList[id].length, 0) + i * 46) / 2 + shdr.readUInt32LE(24) - shdr.readUInt32LE(20) & 0x0000FF00) >> 0x08,
        ((smplIds.slice(0, i).reduce((sum, id) => sum + smplList[id].length, 0) + i * 46) / 2 + shdr.readUInt32LE(24) - shdr.readUInt32LE(20) & 0x00FF0000) >> 0x10,
        ((smplIds.slice(0, i).reduce((sum, id) => sum + smplList[id].length, 0) + i * 46) / 2 + shdr.readUInt32LE(24) - shdr.readUInt32LE(20) & 0xFF000000) >> 0x18,
        ((smplIds.slice(0, i).reduce((sum, id) => sum + smplList[id].length, 0) + i * 46) / 2 + shdr.readUInt32LE(28) - shdr.readUInt32LE(20) & 0x000000FF) >> 0x00,
        ((smplIds.slice(0, i).reduce((sum, id) => sum + smplList[id].length, 0) + i * 46) / 2 + shdr.readUInt32LE(28) - shdr.readUInt32LE(20) & 0x0000FF00) >> 0x08,
        ((smplIds.slice(0, i).reduce((sum, id) => sum + smplList[id].length, 0) + i * 46) / 2 + shdr.readUInt32LE(28) - shdr.readUInt32LE(20) & 0x00FF0000) >> 0x10,
        ((smplIds.slice(0, i).reduce((sum, id) => sum + smplList[id].length, 0) + i * 46) / 2 + shdr.readUInt32LE(28) - shdr.readUInt32LE(20) & 0xFF000000) >> 0x18,
        ((smplIds.slice(0, i).reduce((sum, id) => sum + smplList[id].length, 0) + i * 46) / 2 + shdr.readUInt32LE(32) - shdr.readUInt32LE(20) & 0x000000FF) >> 0x00,
        ((smplIds.slice(0, i).reduce((sum, id) => sum + smplList[id].length, 0) + i * 46) / 2 + shdr.readUInt32LE(32) - shdr.readUInt32LE(20) & 0x0000FF00) >> 0x08,
        ((smplIds.slice(0, i).reduce((sum, id) => sum + smplList[id].length, 0) + i * 46) / 2 + shdr.readUInt32LE(32) - shdr.readUInt32LE(20) & 0x00FF0000) >> 0x10,
        ((smplIds.slice(0, i).reduce((sum, id) => sum + smplList[id].length, 0) + i * 46) / 2 + shdr.readUInt32LE(32) - shdr.readUInt32LE(20) & 0xFF000000) >> 0x18,
        shdr[36],
        shdr[37],
        shdr[38],
        shdr[39],
        shdr[40],
        shdr[41],
        shdr.readUInt16LE(44) & 0b0110 ? (smplIds.indexOf(shdr.readUInt16LE(42)) & 0x00FF) >> 0x00 : 0x00,
        shdr.readUInt16LE(44) & 0b0110 ? (smplIds.indexOf(shdr.readUInt16LE(42)) & 0xFF00) >> 0x08 : 0x00,
        shdr[44],
        shdr[45],
      ]);
    }),
    Uint8Array.from([
      0x45, // E
      0x4F, // O
      0x53, // S
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
    ]),
  ]);

  // pdta
  const pdta = Buffer.concat([
    Uint8Array.from([
      0x4C, // L
      0x49, // I
      0x53, // S
      0x54, // T
      (phdr.length + pbag.length + pmod.length + pgen.length + inst.length + ibag.length + imod.length + igen.length + shdr.length + 4 & 0x000000FF) >> 0x00,
      (phdr.length + pbag.length + pmod.length + pgen.length + inst.length + ibag.length + imod.length + igen.length + shdr.length + 4 & 0x0000FF00) >> 0x08,
      (phdr.length + pbag.length + pmod.length + pgen.length + inst.length + ibag.length + imod.length + igen.length + shdr.length + 4 & 0x00FF0000) >> 0x10,
      (phdr.length + pbag.length + pmod.length + pgen.length + inst.length + ibag.length + imod.length + igen.length + shdr.length + 4 & 0xFF000000) >> 0x18,
      0x70, // p
      0x64, // d
      0x74, // t
      0x61, // a
    ]),
    phdr,
    pbag,
    pmod,
    pgen,
    inst,
    ibag,
    imod,
    igen,
    shdr,
  ]);

  // sfbk
  const sfbk = Buffer.concat([
    Uint8Array.from([
      0x52, // R
      0x49, // I
      0x46, // F
      0x46, // F
      (info.length + sdta.length + pdta.length + 4 & 0x000000FF) >> 0x00,
      (info.length + sdta.length + pdta.length + 4 & 0x0000FF00) >> 0x08,
      (info.length + sdta.length + pdta.length + 4 & 0x00FF0000) >> 0x10,
      (info.length + sdta.length + pdta.length + 4 & 0xFF000000) >> 0x18,
      0x73, // s
      0x66, // f
      0x62, // b
      0x6B, // k
    ]),
    info,
    sdta,
    pdta,
  ]);

  // write sf2 file
  fs.writeFileSync(`dist/${(phdrList[i][22] << 0x08 | phdrList[i][20]).toString(16).padStart(4, '0')}.sf2`, sfbk);
});
