import fs from 'fs';

let s = fs.readFileSync(0, 'utf8');
s += `version: "3.7"\n`;
s = s.replace(/published: "(\d+)"/g, "published: $1");
s = s.replace(/^name: .*\n/, "");

console.log(s);