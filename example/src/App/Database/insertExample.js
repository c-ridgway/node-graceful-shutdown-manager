/*

*/

module.exports = async function(data) {
  let connection;

  try {
    connection = await database.connection;
    const { affectedRows, insertId, warningStatus } = await connection.query("INSERT INTO testme (age, name) VALUES (?, ?)", [data.age, data.name]);

    return insertId;
  } catch(error) {
    throw error;
  } finally {
    connection.release();
  }
};
