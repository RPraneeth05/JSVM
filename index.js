const readline = require('readline');

const MOV_LIT_REG = 0x10;
const MOV_REG_REG = 0x11;
const MOV_REG_MEM = 0x12;
const MOV_MEM_REG = 0x13;
const MOV_LIT_MEM = 0x1B;
const MOV_REG_PTR_REG = 0x1C;
const MOV_LIT_OFF_MEM = 0x1D;

const ADD_REG_REG = 0x14;
const ADD_LIT_REG = 0x3F;
const SUB_LIT_REG = 0x16;
const SUB_REG_LIT = 0x1E;
const SUB_REG_REG = 0x1F;
const INC_REG = 0x35;
const DEC_REG = 0x36;
const MUL_LIT_REG = 0x20;
const MUL_REG_REG = 0x21;

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

   debug() {
      this.registerNames.forEach(name => {
         console.log(`${name}: 0x${this.getRegister(name).toString(16).padStart(4, '0')}`);
      });
   }

   viewMemoryAt(address, n = 8) {
      const nextNBytes = Array.from({ length: n }, (_, i) =>
         this.memory.getUint8(address + i)
      ).map(v => `0x${v.toString(16).padStart(2, '0')}`);
      console.log(`0x${address.toString(16).padStart(4, '0')}: ${nextNBytes.join(' ')}`);
   }

   getRegister(name) {
      if (!(name in this.registerMap)) throw new Error(`getRegister: No such register '${name}'`);
      return this.registers.getUint16(this.registerMap[name]);
   }

   setRegister(name, value) {
      if (!(name in this.registerMap)) throw new Error(`setRegister: No such register '${name}'`);
      return this.registers.setUint16(this.registerMap[name], value);
   }

   fetch8() {
      const nextInstructionAddress = this.getRegister('ip');
      const instruction = this.memory.getUint8(nextInstructionAddress);
      this.setRegister('ip', nextInstructionAddress + 1);
      return instruction;
   }

   fetch16() {
      const nextInstructionAddress = this.getRegister('ip');
      const instruction = this.memory.getUint16(nextInstructionAddress);
      this.setRegister('ip', nextInstructionAddress + 2);
      return instruction;
   }

   push(value) {
      const spAddress = this.getRegister('sp');
      this.memory.setUint16(spAddress, value);
      this.setRegister('sp', spAddress - 2);
      this.stackFrameSize += 2;
   }

   pop() {
      const nextSpAddress = this.getRegister('sp') + 2;
      this.setRegister('sp', nextSpAddress);
      this.stackFrameSize -= 2;
      return this.memory.getUint16(nextSpAddress);
   }

   pushState() {
      this.push(this.getRegister('r1'));
      this.push(this.getRegister('r2'));
      this.push(this.getRegister('r3'));
      this.push(this.getRegister('r4'));
      this.push(this.getRegister('r5'));
      this.push(this.getRegister('r6'));
      this.push(this.getRegister('r7'));
      this.push(this.getRegister('r8'));
      this.push(this.getRegister('ip'));
      this.push(this.stackFrameSize + 2);
      this.setRegister('fp', this.getRegister('sp'));
      this.stackFrameSize = 0;
   }

   popState() {
      const framePointerAddress = this.getRegister('fp');
      this.setRegister('sp', framePointerAddress);
      this.stackFrameSize = this.pop();
      const stackFrameSize = this.stackFrameSize;
      this.setRegister('ip', this.pop());
      this.setRegister('r8', this.pop());
      this.setRegister('r7', this.pop());
      this.setRegister('r6', this.pop());
      this.setRegister('r5', this.pop());
      this.setRegister('r4', this.pop());
      this.setRegister('r3', this.pop());
      this.setRegister('r2', this.pop());
      this.setRegister('r1', this.pop());
      const nArgs = this.pop();
      for (let i = 0; i < nArgs; i++) {
         this.pop();
      }
      this.setRegister('fp', framePointerAddress + stackFrameSize);
   }

   fetchRegisterIndex() {
      return (this.fetch8() % this.registerNames.length) * 2;
   }

   execute(instruction) {
      switch (instruction) {
         case MOV_LIT_REG: {
            const literal = this.fetch16();
            const register = this.fetchRegisterIndex();
            this.registers.setUint16(register, literal);
            return;
         }

         case MOV_REG_REG: {
            const registerFrom = this.fetchRegisterIndex();
            const registerTo = this.fetchRegisterIndex();
            const value = this.registers.getUint16(registerFrom);
            this.registers.setUint16(registerTo, value);
            return;
         }

         case MOV_REG_MEM: {
            const registerFrom = this.fetchRegisterIndex();
            const address = this.fetch16();
            const value = this.registers.getUint16(registerFrom);
            this.memory.setUint16(address, value);
            return;
         }

         case MOV_MEM_REG: {
            const address = this.fetch16();
            const registerTo = this.fetchRegisterIndex();
            const value = this.memory.getUint16(address);
            this.registers.setUint16(registerTo, value);
            return;
         }

         case MOV_LIT_MEM: {
            const value = this.fetch16();
            const address = this.fetch16();
            this.memory.setUint16(address, value);
            return;
         }

         case MOV_REG_PTR_REG: {
            const r1 = this.fetchRegisterIndex();
            const r2 = this.fetchRegisterIndex();
            const ptr = this.registers.getUint16(r1);
            const value = this.memory.getUint16(ptr);
            this.registers.setUint16(r2, value);
            return;
         }

         case MOV_LIT_OFF_MEM: {
            const baseAddress = this.fetch16();
            const r1 = this.fetchRegisterIndex();
            const r2 = this.fetchRegisterIndex();
            const offset = this.registers.getUint16(r1);
            const value = this.memory.getUint16(baseAddress + offset);
            this.registers.setUint16(r2, value);
            return;
         }

         case ADD_REG_REG: {
            const r1 = this.fetchRegisterIndex();
            const r2 = this.fetchRegisterIndex();
            const registerValue1 = this.registers.getUint16(r1);
            const registerValue2 = this.registers.getUint16(r2);
            this.setRegister('ac', registerValue1 + registerValue2);
            return;
         }

         case ADD_LIT_REG: {
            const literal = this.fetch16();
            const r1 = this.fetchRegisterIndex();
            const registerValue = this.registers.getUint16(r1);
            this.setRegister('ac', literal + registerValue);
            return;
         }

         case SUB_LIT_REG: {
            const literal = this.fetch16();
            const r1 = this.fetchRegisterIndex();
            const registerValue = this.registers.getUint16(r1);
            const res = registerValue - literal;
            this.setRegister('ac', res);
            return;
         }

         case SUB_REG_LIT: {
            const r1 = this.fetchRegisterIndex();
            const literal = this.fetch16();
            const registerValue = this.registers.getUint16(r1);
            const res = literal - registerValue;
            this.setRegister('ac', res);
            return;
         }

         case SUB_REG_REG: {
            const r1 = this.fetchRegisterIndex();
            const r2 = this.fetchRegisterIndex();
            const registerValue1 = this.registers.getUint16(r1);
            const registerValue2 = this.registers.getUint16(r2);
            const res = registerValue1 - registerValue2;
            this.setRegister('ac', res);
            return;
         }

         case INC_REG: {
            const r1 = this.fetchRegisterIndex();
            const oldValue = this.registers.getUint16(r1);
            const newValue = oldValue + 1;
            this.registers.setUint16(r1, newValue);
            return;
         }

         case DEC_REG: {
            const r1 = this.fetchRegisterIndex();
            const oldValue = this.registers.getUint16(r1);
            const newValue = oldValue - 1;
            this.registers.setUint16(r1, newValue);
            return;
         }

         case MUL_LIT_REG: {
            const literal = this.fetch16();
            const r1 = this.fetchRegisterIndex();
            const registerValue = this.registers.getUint16(r1);
            const res = literal * registerValue;
            this.setRegister('ac', res);
            return;
         }

         case MUL_REG_REG: {
            const r1 = this.fetchRegisterIndex();
            const r2 = this.fetchRegisterIndex();
            const registerValue1 = this.registers.getUint16(r1);
            const registerValue2 = this.registers.getUint16(r2);
            const res = registerValue1 * registerValue2;
            this.setRegister('ac', res);
            return;
         }

         case LSF_REG_LIT: {
            const r1 = this.fetchRegisterIndex();
            const literal = this.fetch8();
            const registerValue = this.registers.getUint16(r1);
            const res = registerValue << literal;
            this.registers.setUint16(r1, res);
            return;
         }

         case LSF_REG_REG: {
            const r1 = this.fetchRegisterIndex();
            const r2 = this.fetchRegisterIndex();
            const registerValue = this.registers.getUint16(r1);
            const shiftBy = this.registers.getUint16(r2);
            const res = registerValue << shiftBy;
            this.registers.setUint16(r1, res);
            return;
         }

         case RSF_REG_LIT: {
            const r1 = this.fetchRegisterIndex();
            const literal = this.fetch8();
            const registerValue = this.registers.getUint16(r1);
            const res = registerValue >> literal;
            this.registers.setUint16(r1, res);
            return;
         }

         case RSF_REG_REG: {
            const r1 = this.fetchRegisterIndex();
            const r2 = this.fetchRegisterIndex();
            const registerValue = this.registers.getUint16(r1);
            const shiftBy = this.registers.getUint16(r2);
            const res = registerValue >> shiftBy;
            this.registers.setUint16(r1, res);
            return;
         }

         case AND_REG_LIT: {
            const r1 = this.fetchRegisterIndex();
            const literal = this.fetch16();
            const registerValue = this.registers.getUint16(r1);
            const res = registerValue & literal;
            this.setRegister('ac', res);
            return;
         }

         case AND_REG_REG: {
            const r1 = this.fetchRegisterIndex();
            const r2 = this.fetchRegisterIndex();
            const registerValue1 = this.registers.getUint16(r1);
            const registerValue2 = this.registers.getUint16(r2);
            const res = registerValue1 & registerValue2;
            this.setRegister('ac', res);
            return;
         }

         case OR_REG_LIT: {
            const r1 = this.fetchRegisterIndex();
            const literal = this.fetch16();
            const registerValue = this.registers.getUint16(r1);
            const res = registerValue | literal;
            this.setRegister('ac', res);
            return;
         }

         case OR_REG_REG: {
            const r1 = this.fetchRegisterIndex();
            const r2 = this.fetchRegisterIndex();
            const registerValue1 = this.registers.getUint16(r1);
            const registerValue2 = this.registers.getUint16(r2);
            const res = registerValue1 | registerValue2;
            this.setRegister('ac', res);
            return;
         }

         case XOR_REG_LIT: {
            const r1 = this.fetchRegisterIndex();
            const literal = this.fetch16();
            const registerValue = this.registers.getUint16(r1);
            const res = registerValue ^ literal;
            this.setRegister('ac', res);
            return;
         }

         case XOR_REG_REG: {
            const r1 = this.fetchRegisterIndex();
            const r2 = this.fetchRegisterIndex();
            const registerValue1 = this.registers.getUint16(r1);
            const registerValue2 = this.registers.getUint16(r2);
            const res = registerValue1 ^ registerValue2;
            this.setRegister('ac', res);
            return;
         }

         case NOT: {
            const r1 = this.fetchRegisterIndex();
            const registerValue = this.registers.getUint16(r1);
            const res = (~registerValue) & 0xFFFF;
            this.setRegister('ac', res);
            return;
         }

         case JNE_REG: {
            const r1 = this.fetchRegisterIndex();
            const value = this.registers.getUint16(r1);
            const address = this.fetch16();
            if (value !== this.getRegister('ac')) this.setRegister('ip', address);
            return;
         }

         case JNE_LIT: {
            const value = this.fetch16();
            const address = this.fetch16();
            if (value !== this.getRegister('ac')) this.setRegister('ip', address);
            return;
         }

         case JEQ_REG: {
            const r1 = this.fetchRegisterIndex();
            const value = this.registers.getUint16(r1);
            const address = this.fetch16();
            if (value === this.getRegister('ac')) this.setRegister('ip', address);
            return;
         }

         case JEQ_LIT: {
            const value = this.fetch16();
            const address = this.fetch16();
            if (value === this.getRegister('ac')) this.setRegister('ip', address);
            return;
         }

         case JLT_REG: {
            const r1 = this.fetchRegisterIndex();
            const value = this.registers.getUint16(r1);
            const address = this.fetch16();
            if (value < this.getRegister('ac')) this.setRegister('ip', address);
            return;
         }

         case JLT_LIT: {
            const value = this.fetch16();
            const address = this.fetch16();
            if (value < this.getRegister('ac')) this.setRegister('ip', address);
            return;
         }

         case JGT_REG: {
            const r1 = this.fetchRegisterIndex();
            const value = this.registers.getUint16(r1);
            const address = this.fetch16();
            if (value > this.getRegister('ac')) this.setRegister('ip', address);
            return;
         }

         case JGT_LIT: {
            const value = this.fetch16();
            const address = this.fetch16();
            if (value > this.getRegister('ac')) this.setRegister('ip', address);
            return;
         }

         case JLE_REG: {
            const r1 = this.fetchRegisterIndex();
            const value = this.registers.getUint16(r1);
            const address = this.fetch16();
            if (value <= this.getRegister('ac')) this.setRegister('ip', address);
            return;
         }

         case JLE_LIT: {
            const value = this.fetch16();
            const address = this.fetch16();
            if (value <= this.getRegister('ac')) this.setRegister('ip', address);
            return;
         }

         case JGE_REG: {
            const r1 = this.fetchRegisterIndex();
            const value = this.registers.getUint16(r1);
            const address = this.fetch16();
            if (value >= this.getRegister('ac')) this.setRegister('ip', address);
            return;
         }

         case JGE_LIT: {
            const value = this.fetch16();
            const address = this.fetch16();
            if (value >= this.getRegister('ac')) this.setRegister('ip', address);
            return;
         }

         case PSH_LIT: {
            const value = this.fetch16();
            this.push(value);
            return;
         }

         case PSH_REG: {
            const registerIndex = this.fetchRegisterIndex();
            this.push(this.registers.getUint16(registerIndex));
            return;
         }

         case POP: {
            const registerIndex = this.fetchRegisterIndex();
            const value = this.pop();
            this.registers.setUint16(registerIndex, value);
            return;
         }

         case CAL_LIT: {
            const address = this.fetch16();
            this.pushState();
            this.setRegister('ip', address);
            return;
         }

         case CAL_REG: {
            const registerIndex = this.fetchRegisterIndex();
            const address = this.registers.getUint16(registerIndex);
            this.pushState();
            this.setRegister('ip', address);
            return;
         }

         case RET: {
            this.popState();
            return;
         }

         case HLT: {
            return true;
         }
      }
   }

   step() {
      const instruction = this.fetch8();
      return this.execute(instruction);
   }

   run() {
      const halt = this.step();
      if (!halt) setImmediate(() => this.run());
   }
}

class MemoryMapper {
   constructor() {
      this.regions = [];
   }

   map(device, start, end, remap = true) {
      const region = {
         device,
         start,
         end,
         remap
      }
      this.regions.unshift(region);
      return () => {
         this.regions = this.regions.filter(x => x !== region);
      }
   }

   findRegion(address) {
      let region = this.regions.find(r => address >= r.start && address <= r.end);
      if (!region) throw new Error(`No memory region found for address ${address}`);
      return region;
   }

   getUint16(address) {
      const region = this.findRegion(address);
      const finalAddress = region.remap
         ? address - region.start
         : address;
      return region.device.getUint16(finalAddress);
   }

   getUint8(address) {
      const region = this.findRegion(address);
      const finalAddress = region.remap
         ? address - region.start
         : address;
      return region.device.getUint8(finalAddress);
   }

   setUint16(address, value) {
      const region = this.findRegion(address);
      const finalAddress = region.remap
         ? address - region.start
         : address;
      return region.device.setUint16(finalAddress, value);
   }

   setUint8(address, value) {
      const region = this.findRegion(address);
      const finalAddress = region.remap
         ? address - region.start
         : address;
      return region.device.setUint8(finalAddress, value);
   }
}

const eraseScreen = () => {
   process.stdout.write('\x1b[2J');
}

const moveTo = (x, y) => {
   process.stdout.write(`\x1b[${y};${x}H`)
}

const setBold = () => {
   process.stdout.write('\x1b[1m');
}

const setRegular = () => {
   process.stdout.write('\x1b[0m');
}

const createScreenDevice = () => {
   return {
      getUint16: () => 0,
      getUint8: () => 0,
      setUint16: (address, data) => {
         const command = (data & 0xFF00) >> 8;
         const characterValue = data & 0x00FF;
         if (command === 0xFF) eraseScreen();
         else if (command === 0x01) setBold();
         else if (command === 0x02) setRegular();
         const x = (address % 16) + 1;
         const y = Math.floor(address / 16) + 1;
         moveTo(x * 2, y);
         const character = String.fromCharCode(characterValue);
         process.stdout.write(character);
      }
   }
}

const IP = 0x00;
const AC = 0x01;
const R1 = 0x02;
const R2 = 0x03;
const R3 = 0x04;
const R4 = 0x05;
const R5 = 0x06;
const R6 = 0x07;
const R7 = 0x08;
const R8 = 0x09;
const SP = 0x10;
const FP = 0x11;

const MM = new MemoryMapper();
const memory = createMemory(256 * 256);
MM.map(memory, 0, 0xFFFF);
MM.map(createScreenDevice(), 0x3000, 0x30FF);
const wb = new Uint8Array(memory.buffer);
const cpu = new CPU(MM);

let i = 0;



// const waitSubroutineAddress = 0x3100;

// const writeCharToScreen = (char, command, position) => {
//    wb[i++] = MOV_LIT_REG;
//    wb[i++] = command;
//    wb[i++] = char.charCodeAt(0);
//    wb[i++] = R1;
//    wb[i++] = MOV_REG_MEM;
//    wb[i++] = R1;
//    wb[i++] = 0x30;
//    wb[i++] = position;
// }

// let boldValue = 0;

// for (let x = 3; x <= 15; x += 2) {
//    boldValue = boldValue === 0 ? 1 : 0;
//    writeCharToScreen(' ', 0xFF, 0);
//    for (let index = 0; index <= 0xFF; index++) {
//       const command = (index % 2 === boldValue) ? 0x01 : 0x02;
//       const char = (index % x === 0) ? ' ' : '+';
//       writeCharToScreen(char, command, index);
//    }
//    wb[i++] = PSH_LIT;
//    wb[i++] = 0x00;
//    wb[i++] = 0x00;
//    wb[i++] = CAL_LIT;
//    wb[i++] = (waitSubroutineAddress & 0xFF00) >> 8;
//    wb[i++] = (waitSubroutineAddress & 0x00FF);
// }

// wb[i++] = MOV_LIT_REG;
// wb[i++] = 0x00;
// wb[i++] = 0x00;
// wb[i++] = IP;
// i = waitSubroutineAddress;
// wb[i++] = MOV_LIT_REG;
// wb[i++] = 0x00;
// wb[i++] = 0x01;
// wb[i++] = R1;
// wb[i++] = MOV_LIT_REG;
// wb[i++] = 0x00;
// wb[i++] = 0x00;
// wb[i++] = AC;
// const loopStart = i;4
// wb[i++] = ADD_REG_REG;
// wb[i++] = R1;
// wb[i++] = AC;
// wb[i++] = JNE_LIT;
// wb[i++] = 0xCC;
// wb[i++] = 0xFF;
// wb[i++] = (loopStart & 0xFF00) >> 8;
// wb[i++] = (loopStart & 0x00FF);
// wb[i++] = RET;

// cpu.run();



// writeCharToScreen(' ', 0xFF, 0);
// 'Hello World!'.split('').forEach((char, index) => {
//    writeCharToScreen(char, index);
// });
// for (let index = 0; index <= 0xFF; index++) {
//    const command = index % 2 === 0 ? 0x01 : 0x02;
//    writeCharToScreen('*', command, index);
// }
// wb[i++] = HLT;
// cpu.run();



wb[i++] = ;
wb[i++] = ;
wb[i++] = ;
wb[i++] = ;
wb[i++] = ;
wb[i++] = ;
wb[i++] = ;
wb[i++] = ;
wb[i++] = ;
wb[i++] = ;
wb[i++] = ;
wb[i++] = ;
wb[i++] = ;

// DEBUGGING CODE

cpu.debug();
cpu.viewMemoryAt(cpu.getRegister('ip'));
cpu.viewMemoryAt(0xFFFF - 43, 44);

const rl = readline.createInterface({
   input: process.stdin,
   output: process.stdout
});

rl.on('line', () => {
   cpu.step();
   cpu.debug();
   cpu.viewMemoryAt(cpu.getRegister('ip'));
   cpu.viewMemoryAt(0xFFFF - 43, 44);
});