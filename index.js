const readline = require('readline');

// Move commands
const MOV_LIT_REG = 0x10;
const MOV_REG_REG = 0x11;
const MOV_REG_MEM = 0x12;
const MOV_MEM_REG = 0x13;
const MOV_LIT_MEM = 0x1B;
const MOV_REG_PTR_REG = 0x1C;
const MOV_LIT_OFF_MEM = 0x1D;

// Math commands
const ADD_REG_REG = 0x14;
const ADD_LIT_REG = 0x3F;
const SUB_LIT_REG = 0x16;
const SUB_REG_LIT = 0x1E;
const SUB_REG_REG = 0x1F;
const INC_REG = 0x35;
const DEC_REG = 0x36;
const MUL_LIT_REG = 0x20;
const MUL_REG_REG = 0x21;

// Logic commands
const LSF_REG_LIT = 0x26;
const LSF_REG_REG = 0x27;
const RSF_REG_LIT = 0x2A;
const RSF_REG_REG = 0x2B;
const AND_REG_LIT = 0x2E;
const AND_REG_REG = 0x2F;
const OR_REG_LIT = 0x30;
const OR_REG_REG = 0x31;
const XOR_REG_LIT = 0x32;
const XOR_REG_REG = 0x33;
const NOT = 0x34;

// Conditional branching
const JNE_REG = 0x40;
const JNE_LIT = 0x15;
const JEQ_REG = 0x3E;
const JEQ_LIT = 0x41;
const JLT_REG = 0x42;
const JLT_LIT = 0x43;
const JGT_REG = 0x44;
const JGT_LIT = 0x45;
const JLE_REG = 0x46;
const JLE_LIT = 0x47;
const JGE_REG = 0x48;
const JGE_LIT = 0x49;

// Subroutine and stack functions
const PSH_LIT = 0x17;
const PSH_REG = 0x18;
const POP = 0x1A;
const CAL_LIT = 0x5E;
const CAL_REG = 0x5F;
const RET = 0x60;
const HLT = 0xFF;

const createMemory = sizeInBytes => {
   const ab = new ArrayBuffer(sizeInBytes);
   const dv = new DataView(ab);
   return dv;
}

const registerNames = [
   'ip', 'ac',
   'r1', 'r2', 'r3', 'r4',
   'r5', 'r6', 'r7', 'r8',
   'sp', 'fp'
]

class CPU {
   constructor(memory) {
      this.memory = memory;
      this.registerNames = registerNames;
      this.registers = createMemory(this.registerNames.length * 2);
      this.registerMap = this.registerNames.reduce((map, name, i) => {
         map[name] = i * 2;
         return map;
      }, {});
      this.setRegister('sp', 0xFFFE);
      this.setRegister('fp', 0xFFFE);
      this.stackFrameSize = 0;
   }
}