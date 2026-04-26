const fs = require('fs');
const PizZip = require('pizzip');

// Crear un DOCX mínimo válido con placeholders
const zip = new PizZip();

const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    <w:p>
      <w:pPr><w:pStyle w:val="Heading1"/></w:pPr>
      <w:r><w:t>CONTRATO DE COMPRAVENTA</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>En la ciudad de </w:t></w:r>
      <w:r><w:t>{{inmueble.ciudad}}</w:t></w:r>
      <w:r><w:t>, a </w:t></w:r>
      <w:r><w:t>{{fecha.hoy}}</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>REUNIDOS:</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>De una parte, D./Dña. </w:t></w:r>
      <w:r><w:t>{{vendedor.nombre}}</w:t></w:r>
      <w:r><w:t> </w:t></w:r>
      <w:r><w:t>{{vendedor.apellidos}}</w:t></w:r>
      <w:r><w:t>, con DNI </w:t></w:r>
      <w:r><w:t>{{vendedor.dni}}</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>Y de otra parte, D./Dña. </w:t></w:r>
      <w:r><w:t>{{cliente.nombre}}</w:t></w:r>
      <w:r><w:t> </w:t></w:r>
      <w:r><w:t>{{cliente.apellidos}}</w:t></w:r>
      <w:r><w:t>, con DNI </w:t></w:r>
      <w:r><w:t>{{cliente.dni}}</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>El inmueble sito en </w:t></w:r>
      <w:r><w:t>{{inmueble.direccion}}</w:t></w:r>
      <w:r><w:t>, con precio de </w:t></w:r>
      <w:r><w:t>{{inmueble.precio}}</w:t></w:r>
      <w:r><w:t> euros.</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>Agente responsable: </w:t></w:r>
      <w:r><w:t>{{agente.nombre}}</w:t></w:r>
    </w:p>
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
    </w:sectPr>
  </w:body>
</w:document>`;

zip.file('[Content_Types].xml', contentTypes);
zip.file('_rels/.rels', rels);
zip.file('word/document.xml', documentXml);

const buffer = zip.generate({ type: 'nodebuffer' });
fs.writeFileSync('/tmp/test_template.docx', buffer);

console.log('✅ DOCX de prueba creado: /tmp/test_template.docx');
console.log('📋 Placeholders incluidos:');
console.log('  - {{inmueble.ciudad}}');
console.log('  - {{fecha.hoy}}');
console.log('  - {{vendedor.nombre}}, {{vendedor.apellidos}}, {{vendedor.dni}}');
console.log('  - {{cliente.nombre}}, {{cliente.apellidos}}, {{cliente.dni}}');
console.log('  - {{inmueble.direccion}}, {{inmueble.precio}}');
console.log('  - {{agente.nombre}}');
