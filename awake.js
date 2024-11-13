inlets = 1;
outlets = 2;

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
}

class Awake {
  constructor() {
    this.reset();
  }

  reset() {
    this.sequences = [
      new Sequencer([1, 0, 3, 5, 6, 7, 8, 7]),
      new Sequencer([5, 7, 0, 0, 0, 0, 0])
    ];
    this.expression = 'a + b';
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
      // Get current values from all sequences
      const values = this.sequences.map(seq => seq.getNote());

      // Create an evaluation context with sequence values
      const context = {};
      'abcdefghijk'.split('').forEach((letter, i) => {
        if (i < values.length) context[letter] = values[i];
      });

      // Evaluate the expression
      const result = this.evaluateExpression(this.expression, context);

      // Output result
      post(`(expr: ${this.expression}) = ${result}\n`);
      return result;

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

  // dump the state to the console
  dump() {
    post(`${JSON.stringify(this.sequences)}\n`);
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
function expr(expression) {
  if (inlet === 0) {
    awake.setExpression(expression);
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