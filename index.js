#!/usr/bin/env node
const request = require('request'),
      commander = require('commander'),
      fs = require('fs');

const EOL = "\n";

commander
  .option('-u --uri <uri>', 'the uri of the swagger (required)')
  .option('-o --out <outFile>', 'output file path', '.\\out.d.ts')
  .option('-d --dry-run', 'print the output instead of writing it to disk')
  .parse(process.argv);

if(commander.uri === void 0) {
  commander.outputHelp();
  return;
}

var fileBuffer = "";

request.get(commander.uri, (err, resp, body) => {
  main(JSON.parse(body));
});

function main(data) {
  for(let className in data.definitions) {
    buildClass(className, data.definitions[className])
  }

  if(commander.dryRun) {
    console.log(fileBuffer);
  }
  else {
    fs.writeFileSync(commander.out, fileBuffer);
  }
}

function buildClass(className, classData) {
  fileBuffer += `export interface ${className} {${EOL}`;
  let props = classData.properties;

  for(let propName in props) {
    fileBuffer += `  ${propName}: ${buildTypeDef(props[propName])};${EOL}`;
  }

  fileBuffer += `}${EOL}${EOL}`;
}

function buildTypeDef(prop) {
  if(prop.$ref !== void 0) {
    return getObjectName(prop.$ref);
  }

  let mappedType = mapType(prop.type);

  if(mappedType !== null) {
    return mappedType;
  }
  else if(prop.type === 'array') {
    let itemsType = mapType(prop.items.type);
    if(itemsType !== null) {
      return `${itemsType}[]`;
    }
    else if(prop.items.$ref !== void 0) {
      // it's an object
      return `${getObjectName(prop.items.$ref)}[]`;
    }
    else {
      return 'any[]';
    }
  }

  return 'any'
}

function getObjectName(ref) {
  let parts = ref.split('/');
  return  parts[parts.length -1];
}

function mapType(type) {
  switch(type) {
    case 'string':
      return 'string'
    case 'integer':
      return 'number'
    case 'number':
      return 'number'
    case 'boolean':
      return 'boolean'
    default:
      return null;
  }
}
