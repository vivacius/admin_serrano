import { execSync } from 'node:child_process'
import { db, hashClave, uuid } from './db.js'
import { importarDatosExcel } from './load_excel_to_db.js'

export function resetearEImportar() {
  console.log('1. Extrayendo datos frescos del archivo Excel...')
  execSync('python server/extract_excel.py', { stdio: 'inherit' })

  console.log('2. Limpiando tablas de datos previas...')
  db.exec('PRAGMA foreign_keys = OFF;')
  db.prepare("update contadores set valor = 1 where nombre = 'admin_delete'").run()

  db.exec(`
    delete from auditoria_movimientos;
    delete from compromisos_pago;
    delete from pagos_comisiones;
    delete from comisiones;
    delete from documentos;
    delete from recibos;
    delete from abonos;
    delete from negociacion_clientes;
    delete from negociaciones;
    delete from clientes;
    delete from lotes;
    delete from proyectos;
    update contadores set valor = 0 where nombre = 'recibos';
    update contadores set valor = 0 where nombre = 'admin_delete';
  `)
  db.exec('PRAGMA foreign_keys = ON;')

  console.log('3. Verificando usuarios autorizados...')
  if (db.prepare('select count(*) c from usuarios').get().c === 0) {
    const ins = (sql, ...a) => db.prepare(sql).run(...a)
    ins('insert into usuarios(id,email,clave_hash,nombre,rol) values (?,?,?,?,?)', uuid(), 'admin@serrano.local', hashClave('admin123'), 'Administrador Demo', 'administrador')
    ins('insert into usuarios(id,email,clave_hash,nombre,rol) values (?,?,?,?,?)', uuid(), 'cartera@serrano.local', hashClave('cartera123'), 'Cartera Demo', 'cartera')
    ins('insert into usuarios(id,email,clave_hash,nombre,rol) values (?,?,?,?,?)', uuid(), 'consulta@serrano.local', hashClave('consulta123'), 'Consulta Demo', 'consulta')
  }

  console.log('4. Importando datos del Excel a SQLite...')
  const res = importarDatosExcel('server/data/excel_dump.json')
  console.log('¡Importación completada con éxito!')
  console.log(res)
  return res
}

if (process.argv[1]?.endsWith('reset_and_import.js')) {
  resetearEImportar()
}
