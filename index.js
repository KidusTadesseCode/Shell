#!/usr/bin/env node

/**
 * This is a special line called a "shebang". It tells the operating system
 * to execute this file using the Node.js runtime.
 */

// The 'process.argv' property returns an array containing the command-line arguments.
// The first element is the process execution path (node).
// The second element is the path to the JavaScript file being executed.
// The remaining elements are any additional command-line arguments.
// We use .slice(2) to get only the user-provided arguments.
const args = process.argv.slice(2);

// Check if the user provided any arguments.
if (args.length === 0) {
  console.log("Please provide some numbers to sum.");
  // Exit the process with an error code.
  process.exit(1);
}

// We'll use reduce to calculate the sum.
// 'acc' is the accumulator (starts at 0), and 'num' is the current number.
// We use parseFloat() to convert the string argument into a number.
const sum = args.reduce((acc, num) => {
  const parsedNum = parseFloat(num);
  // Check if the argument is a valid number. If not, we'll ignore it
  // and print a warning.
  if (isNaN(parsedNum)) {
    console.warn(`Warning: Ignoring non-numeric input "${num}"`);
    return acc;
  }
  return acc + parsedNum;
}, 0);

// Log the final result to the console.
console.log(`The sum is: ${sum}`);
