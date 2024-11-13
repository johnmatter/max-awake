inlets = 1;
outlets = 2;

class MusicUtil {
  static SCALES = {
    'Major': [0, 2, 4, 5, 7, 9, 11],
    'Natural Minor': [0, 2, 3, 5, 7, 8, 10],
    'Harmonic Minor': [0, 2, 3, 5, 7, 8, 11],
    'Melodic Minor': [0, 2, 3, 5, 7, 9, 11],
    'Dorian': [0, 2, 3, 5, 7, 9, 10],
    'Phrygian': [0, 1, 3, 5, 7, 8, 10],
    'Lydian': [0, 2, 4, 6, 7, 9, 11],
    'Mixolydian': [0, 2, 4, 5, 7, 9, 10],
    'Locrian': [0, 1, 3, 5, 6, 8, 10],
    'Whole Tone': [0, 2, 4, 6, 8, 10],
    'Major Pentatonic': [0, 2, 4, 7, 9],
    'Minor Pentatonic': [0, 3, 5, 7, 10],
    'Blues Scale': [0, 3, 5, 6, 7, 10],
    'Chromatic': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
  };

  static generateScaleOfLength(rootNote, scaleType, length) {
    if (!this.SCALES[scaleType]) {
      throw new Error(`Unknown scale type: ${scaleType}`);
    }

    const scalePattern = this.SCALES[scaleType];
    const result = [];
    let octave = 0;
    let index = 0;

    while (result.length < length) {
      const noteIndex = index % scalePattern.length;
      const note = rootNote + scalePattern[noteIndex] + (octave * 12);
      
      if (note > 127) break; // MIDI note limit
      result.push(note);
      
      index++;
      if (noteIndex === scalePattern.length - 1) {
        octave++;
      }
    }

    return result;
  }

  static generateScale(rootNote, scaleType, octaves = 1) {
    if (!this.SCALES[scaleType]) {
      throw new Error(`Unknown scale type: ${scaleType}`);
    }

    const scalePattern = this.SCALES[scaleType];
    const result = [];

    for (let octave = 0; octave < octaves; octave++) {
      for (const interval of scalePattern) {
        const note = rootNote + interval + (octave * 12);
        if (note <= 127) { // MIDI note limit
          result.push(note);
        }
      }
    }

    return result;
  }
}

class Sequencer {
  constructor(notes = [0, 0, 0, 0, 0, 0, 0, 0]) {
    this.notes = notes;
    this.position = 0;
  }

  advance() {
    this.position = (this.position + 1) % this.notes.length;
  }

  getNote() {
    return this.notes[this.position];
  }

  setNote(note) {
    this.notes[this.position] = note;
  }
}

class Awake {
  constructor() {
    this.init();
  }

  init() {
    this.sequences = [
      new Sequencer([1, 0, 3, 5, 6, 7, 8, 7]),
      new Sequencer([5, 7, 0, 0, 0, 0, 0])
    ];
    this.expression = 'a + b';
    this.setScale(48, 'Dorian', 16);
  }

  reset() {
    // set all sequencers position to 0
    this.sequences.forEach(seq => seq.position = 0);
  }

  setScale(rootNote, scaleType, length) {
    try {
      this.scale = MusicUtil.generateScaleOfLength(rootNote, scaleType, length);
      this.rootNote = rootNote;
      this.scaleType = scaleType;
      this.scaleLength = length;
      post(`Scale set to ${scaleType} starting at note ${rootNote}\n`);
    } catch (err) {
      post(`Error setting scale: ${err.message}\n`);
    }
  }

  advanceSequence(seqIndex) {
    if (!this.isPlaying) return;

    try {
      const seq = this.sequences[seqIndex];
      if (seq) {
        seq.advance();
      }
    } catch (err) {
      post(`Error advancing sequence ${seqIndex}: ${err.message}\n`);
    }
  }

  getNote() {
    try {
      // Get current indices from all sequences
      const indices = this.sequences.map(seq => seq.getNote());

      // Create an evaluation context with sequence values
      const context = {};
      'abcdefghijk'.split('').forEach((letter, i) => {
        if (i < indices.length) context[letter] = indices[i];
      });

      // Evaluate the expression
      const resultIndex = this.evaluateExpression(this.expression, context);
      
      // Map the result to a note in our scale
      const note = this.scale[Math.abs(Math.round(resultIndex)) % this.scale.length];
      
      post(`(expr: ${this.expression}) = ${resultIndex} -> ${note}\n`);
      return note;
    } catch (err) {
      post(`(expr: ${this.expression}) ERROR: ${err.message}\n`);
    }
  }

  evaluateExpression(expr, context) {
    // Create a function from the expression
    const vars = Object.keys(context).join(',');
    const func = new Function(vars, `return ${expr}`);
    return func(...Object.values(context));
  }

  setExpression(expr) {
    try {
      // Test the expression first
      const testContext = {};
      'abcdefghijk'.split('').forEach((letter, i) => {
        testContext[letter] = 1;
      });
      this.evaluateExpression(expr, testContext);

      // If there was no error, save the expression
      this.expression = expr;
      post(`Expression set to: ${expr}\n`);
    } catch (err) {
      post(`Invalid expression: ${err.message}\n`);
    }
  }

  // Return the sequence as a list of notes
  getSequence(seqIndex) {
    return this.sequences[seqIndex].notes;
  }

  // Return the sequences as a dictionary of lists
  getSequences() {
    return this.sequences.map(seq => seq.notes);
  }

  setNote(seqIndex, note) {
    this.sequences[seqIndex].setNote(note);
  }

  setSequence(seqIndex, sequence) {
    this.sequences[seqIndex] = new Sequencer(sequence);
  }

  getStateDictionary() {
    // Create a serialized dictionary string that dict.deserialize can read
    const parts = [];
    
    // Add scale information
    parts.push(`root : ${this.rootNote}`);
    parts.push(`scale_type : ${this.scaleType}`);
    parts.push(`scale_length : ${this.scaleLength}`);
    
    // Number of sequences
    parts.push(`num_sequences : ${this.sequences.length}`);

    // Add sequences
    this.sequences.forEach((seq, index) => {
      parts.push(`sequence_${index} : ${seq.notes.join(" ")}`);
    });
    
    // Add expression
    parts.push(`expression : ${this.expression}`);
    
    return parts.join(" ");
  }

  dump() {
    const dictString = this.getStateDictionary();
    outlet(1, dictString);
  }
}

// Global instance
var awake = new Awake();

// handlers for built-in types
function bang() {
  if (inlet === 0) {
    // Output the current note value
    outlet(0, awake.getNote());

    // Advance sequences
    awake.sequences.forEach(seq => seq.advance());
  }
}

// handlers for messages
function setExpression(expression) {
  if (inlet === 0) {
    awake.setExpression(expression);
  }
}

function setScale(rootNote, scaleType, length) {
  if (inlet === 0) {
    awake.setScale(rootNote, scaleType, length);
  }
}

function reset() {
  awake.reset();
}

function getSequence(seqIndex) {
  outlet(1, awake.getSequence(seqIndex));
}

function getSequences() {
  outlet(1, awake.getSequences());
}

function dump() {
  awake.dump();
}