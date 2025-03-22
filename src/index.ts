/**
 * QueueMincer - TypeScript Project
 */

// Node.js imports
import process from 'process';

const main = async (): Promise<void> => {
  console.log('QueueMincer is running!');
};

main().catch(error => {
  console.error('Error in QueueMincer:', error);
  process.exit(1);
}); 