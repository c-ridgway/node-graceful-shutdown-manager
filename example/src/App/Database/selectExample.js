/*

*/

module.exports = async function() {
  let connection;

  try {
    connection = await database.connection;
    const rows = await connection.query("SELECT * FROM testme");

    return rows; // Array of elements
  } catch(error) {
    throw error;
  } finally {
    connection.release();
  }
};
