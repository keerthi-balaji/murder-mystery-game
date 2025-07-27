let db;

async function initDatabase() {
  const SQL = await initSqlJs({
    locateFile: filename => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.6.2/${filename}`
  });

  db = new SQL.Database();

  // Fetch all datasets
  const [
    employeesData,
    accessLogs,
    locationsData,
    wifiLogsData,
    schedulesData,
    messagesData,
    serverCommandsData
  ] = await Promise.all([
    fetch('data/employees.json').then(res => res.json()),
    fetch('data/access_logs.json').then(res => res.json()),
    fetch('data/locations.json').then(res => res.json()),
    fetch('data/wifi_logs.json').then(res => res.json()),
    fetch('data/schedules.json').then(res => res.json()),
    fetch('data/messages.json').then(res => res.json()),
    fetch('data/server_commands.json').then(res => res.json())
  ]);

  // Create Tables
  db.run(`CREATE TABLE employees (
    employee_id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT,
    department TEXT,
    remote BOOLEAN
  );`);

  db.run(`CREATE TABLE access_logs (
    log_id INTEGER PRIMARY KEY,
    employee_id INTEGER,
    location_id INTEGER,
    timestamp TEXT,
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id),
    FOREIGN KEY (location_id) REFERENCES locations(location_id)
  );`);

  db.run(`CREATE TABLE locations (
    location_id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    is_restricted BOOLEAN
  );`);

  db.run(`CREATE TABLE wifi_logs (
    ping_id INTEGER PRIMARY KEY,
    employee_id INTEGER,
    location_id INTEGER,
    ping_time TEXT,
    signal_strength INTEGER,
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id),
    FOREIGN KEY (location_id) REFERENCES locations(location_id)
  );`);

  db.run(`CREATE TABLE schedules (
    schedule_id INTEGER PRIMARY KEY,
    employee_id INTEGER,
    location_id INTEGER,
    start_time TEXT,
    end_time TEXT,
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id),
    FOREIGN KEY (location_id) REFERENCES locations(location_id)
  );`);

  db.run(`CREATE TABLE messages (
    message_id INTEGER PRIMARY KEY,
    sender_id INTEGER,
    receiver_id INTEGER,
    message_time TEXT,
    message_text TEXT,
    is_encrypted BOOLEAN,
    recovered BOOLEAN,
    FOREIGN KEY (sender_id) REFERENCES employees(employee_id),
    FOREIGN KEY (receiver_id) REFERENCES employees(employee_id)
  );`);

  db.run(`CREATE TABLE server_commands (
    command_id INTEGER PRIMARY KEY,
    employee_id INTEGER,
    run_time TEXT,
    command_text TEXT,
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
  );`);

  // Insert Data
  const insertEmployee = db.prepare("INSERT INTO employees VALUES (?, ?, ?, ?, ?)");
  for (const row of employeesData) {
    console.log("employee row:", row);
    insertEmployee.run([row.employee_id, row.name, row.role, row.department, row.remote]);
  }
  insertEmployee.free();

  const insertAccess = db.prepare("INSERT INTO access_logs VALUES (?, ?, ?, ?)");
  for (const row of accessLogs) {
    console.log("access log row:", row);
    insertAccess.run([row.log_id, row.employee_id, row.location_id, row.timestamp]);
  }
  insertAccess.free();

  const insertLocation = db.prepare("INSERT INTO locations VALUES (?, ?, ?)");
  for (const row of locationsData) {
    console.log("location row:", row);
    insertLocation.run([row.location_id, row.name, row.is_restricted]);
  }
  insertLocation.free();

  const insertWifi = db.prepare("INSERT INTO wifi_logs VALUES (?, ?, ?, ?, ?)");
  for (const row of wifiLogsData) {
    console.log("wifi log row:", row);
    insertWifi.run([row.ping_id, row.employee_id, row.location_id, row.ping_time, row.signal_strength]);
  }
  insertWifi.free();

  const insertSchedule = db.prepare("INSERT INTO schedules VALUES (?, ?, ?, ?, ?)");
  for (const row of schedulesData) {
    console.log("schedule row:", row);
    insertSchedule.run([row.schedule_id, row.employee_id, row.location_id, row.start_time, row.end_time]);
  }
  insertSchedule.free();

  const insertMessage = db.prepare("INSERT INTO messages VALUES (?, ?, ?, ?, ?, ?, ?)");
  for (const row of messagesData) {
    console.log("message row:", row);
    insertMessage.run([
      row.message_id,
      row.sender_id,
      row.receiver_id,
      row.message_time,
      row.message_text,
      row.is_encrypted,
      row.recovered
    ]);
  }
  insertMessage.free();

  const insertCommand = db.prepare("INSERT INTO server_commands VALUES (?, ?, ?, ?)");
  for (const row of serverCommandsData) {
    console.log("command row:", row);
    insertCommand.run([
      row.command_id,
      row.employee_id,
      row.run_time,
      row.command_text
    ]);
  }
  insertCommand.free();
}
