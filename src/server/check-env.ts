import fs from 'fs';

export function checkEnv(variableName: string) {
  const value = process.env[variableName];
  if (!value) {
    console.warn('%s is not configured!', variableName);
  } else {
    fs.access(value, e => {
      if (e) {
        console.warn('Could not access %s %s\n%s', variableName, process.env[variableName], e);
      } else {
        console.info('Found %s %s', variableName, process.env[variableName]);
      }
    })
  }
}