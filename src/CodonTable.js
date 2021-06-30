//////////////////////////////////////////////////////////////////////////////
// Codon Table
//////////////////////////////////////////////////////////////////////////////

// FIXME: should this be 2 files!!!!!!!!!!!!!!!!!!!!!!!!!!

/**
 * Holder for CodonTables.
 * This class will be populated with each CodonTable as it's required.
 */
class CodonTables {

  constructor(font) {
    this._tables = {};
  }

  get tables() {
    return this._tables;
  }

  // ID can be a number or a string of a number
  byID(id) {
    const availableIDs = CodonTable.availableGeneticCodeIDs;
    const idString = id.toString();
    let table;
    if (this.tables[idString]) {
      table = this.tables[idString];
    } else if (availableIDs.includes(idString)) {
      table = new CodonTable(idString);
      this.tables[idString] = table;
    } else {
      console.error(`Unknown Codon Table ID: '${id}'`)
    }
    return table;
  }

  names() {
    const codes = {};
    const ids = Object.keys(CodonTable.definitions);
    ids.map( id => codes[id] = CodonTable.definitions[id].name);
    return codes
  }

  translate(seq, geneticCodeID, startCodon=1) {
    const table = this.byID(geneticCodeID);
    if (table) {
      return table.translate(seq, startCodon);
    }
  }
}

/**
 * <br />
 * This class contains all the codon tables and has the ability to translate
 * DNA seqeunces to protein.
 *
 */
class CodonTable {

  constructor(geneticCodeID) {
    this._codons = this.generateCodons();
    this._geneticCodeID = geneticCodeID && geneticCodeID.toString();
    this._generateTable();
  }

  /**
   * Return the class name as a string.
   * @return {String} - 'CodonTable'
   */
  toString() {
    return 'CodonTable';
  }

  static get availableGeneticCodeIDs() {
    return Object.keys(CodonTable.definitions);
  }

  get codons() {
    return this._codons;
  }

  get geneticCodeID() {
    return this._geneticCodeID;
  }

  get name() {
    return this._name;
  }

  get table() {
    return this._table;
  }

  get starts() {
    return this._starts;
  }

  get stops() {
    return this._stops;
  }

  _generateTable() {
    const codeID = this.geneticCodeID;
    if (CodonTable.availableGeneticCodeIDs.includes(codeID)) {
      const definition = CodonTable.definitions[codeID];
      // Name
      this._name = definition.name;
      // Table, starts, stops
      const table = {};
      const starts = [];
      const stops = [];
      for (const [i, codon] of this.codons.entries()) {
        table[codon] = definition.aa[i];
        if (definition.starts[i] === 'M') {
          starts.push(codon);
        }
        if (definition.aa[i] === '*') {
          stops.push(codon);
        }
      }
      this._table = table;
      this._starts = starts;
      this._stops = stops;
    } else {
      console.error(`Unknown Codon Table ID: '${codeID}'`)
    }
  }


  generateCodons() {
    // Base1 = TTTTTTTTTTTTTTTTCCCCCCCCCCCCCCCCAAAAAAAAAAAAAAAAGGGGGGGGGGGGGGGG
    // Base2 = TTTTCCCCAAAAGGGGTTTTCCCCAAAAGGGGTTTTCCCCAAAAGGGGTTTTCCCCAAAAGGGG
    // Base3 = TCAGTCAGTCAGTCAGTCAGTCAGTCAGTCAGTCAGTCAGTCAGTCAGTCAGTCAGTCAGTCAG
    const bases = ['T', 'C', 'A', 'G'];
    const codons = [];
    for (const b1 of bases) {
      for (const b2 of bases) {
        for (const b3 of bases) {
          codons.push(`${b1}${b2}${b3}`);
        }
      }
    }
    return codons;
  }

  static get definitions() {
    //   Base1 = TTTTTTTTTTTTTTTTCCCCCCCCCCCCCCCCAAAAAAAAAAAAAAAAGGGGGGGGGGGGGGGG
    //   Base2 = TTTTCCCCAAAAGGGGTTTTCCCCAAAAGGGGTTTTCCCCAAAAGGGGTTTTCCCCAAAAGGGG
    //   Base3 = TCAGTCAGTCAGTCAGTCAGTCAGTCAGTCAGTCAGTCAGTCAGTCAGTCAGTCAGTCAGTCAG
    const definitions = {
      1: {
        name:   'Standard',
        aa:     'FFLLSSSSYY**CC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG',
        starts: '---M---------------M---------------M----------------------------',
      },
      2: {
        name:   'Vertebrate Mitochondrial',
        aa:     'FFLLSSSSYY**CCWWLLLLPPPPHHQQRRRRIIMMTTTTNNKKSS**VVVVAAAADDEEGGGG',
        starts: '--------------------------------MMMM---------------M------------',
      },
      3: {
        name:   'Yeast Mitochondrial',
        aa:     'FFLLSSSSYY**CCWWTTTTPPPPHHQQRRRRIIMMTTTTNNKKSSRRVVVVAAAADDEEGGGG',
        starts: '----------------------------------MM----------------------------',
      },
      4: {
        name:   'Mold, Protozoan, Coelenterate Mitochondrial and Mycoplasma/Spiroplasma',
        aa:     'FFLLSSSSYY**CCWWLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG',
        starts: '--MM---------------M------------MMMM---------------M------------',
      },
      5: {
        name:   'Invertebrate Mitochondrial',
        aa:     'FFLLSSSSYY**CCWWLLLLPPPPHHQQRRRRIIMMTTTTNNKKSSSSVVVVAAAADDEEGGGG',
        starts: '---M----------------------------MMMM---------------M------------',
      },
      6: {
        name:   'Ciliate, Dasycladacean and Hexamita Nuclear',
        aa:     'FFLLSSSSYYQQCC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG',
        starts: '-----------------------------------M----------------------------',
      },
      9: {
        name:   'Echinoderm and Flatworm Mitochondrial',
        aa:     'FFLLSSSSYY**CCWWLLLLPPPPHHQQRRRRIIIMTTTTNNNKSSSSVVVVAAAADDEEGGGG',
        starts: '-----------------------------------M---------------M------------',
      },
      10: {
        name:   'Euplotid Nuclear',
        aa:     'FFLLSSSSYY**CCCWLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG',
        starts: '-----------------------------------M----------------------------',
      },
      11: {
        name:   'Bacterial and Plant Plastid',
        aa:     'FFLLSSSSYY**CC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG',
        starts: '---M---------------M------------MMMM---------------M------------',
      },
      12: {
        name:   'Alternative Yeast Nuclear',
        aa:     'FFLLSSSSYY**CC*WLLLSPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG',
        starts: '-------------------M---------------M----------------------------',
      },
      13: {
        name:   'Ascidian Mitochondrial',
        aa:     'FFLLSSSSYY**CCWWLLLLPPPPHHQQRRRRIIMMTTTTNNKKSSGGVVVVAAAADDEEGGGG',
        starts: '---M------------------------------MM---------------M------------',
      },
      14: {
        name:   'Alternative Flatworm Mitochondrial',
        aa:     'FFLLSSSSYYY*CCWWLLLLPPPPHHQQRRRRIIIMTTTTNNNKSSSSVVVVAAAADDEEGGGG',
        starts: '-----------------------------------M----------------------------',
      },
      15: {
        name:   'Blepharisma Nuclear',
        aa:     'FFLLSSSSYY*QCC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG',
        starts: '-----------------------------------M----------------------------',
      },
      16: {
        name:   'Chlorophycean Mitochondrial',
        aa:     'FFLLSSSSYY*LCC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG',
        starts: '-----------------------------------M----------------------------',
      },
      21: {
        name:   'Trematode Mitochondrial',
        aa:     'FFLLSSSSYY**CCWWLLLLPPPPHHQQRRRRIIMMTTTTNNNKSSSSVVVVAAAADDEEGGGG',
        starts: '-----------------------------------M---------------M------------',
      },
      22: {
        name:   'Scenedesmus obliquus mitochondrial',
        aa:     'FFLLSS*SYY*LCC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG',
        starts: '-----------------------------------M----------------------------',
      },
      23: {
        name:   'Thraustochytrium Mitochondrial',
        aa:     'FF*LSSSSYY**CC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG',
        starts: '--------------------------------M--M---------------M------------',
      },
    }
    return definitions;
  }

  translate(rawSeq, codonStart=1) {
    const codonSize = 3;
    const seq = rawSeq.toUpperCase();
    let index = -1 + codonStart;
    let codon = seq.slice(index, index + codonSize);
    let translated = '';
    while (codon.length === codonSize) {
      translated += this.table[codon] || 'X';
      index += codonSize;
      codon = seq.slice(index, index + codonSize);
    }
    return translated;
  }

}

export { CodonTables, CodonTable };

