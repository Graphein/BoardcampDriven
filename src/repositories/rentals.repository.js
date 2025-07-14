import { connection } from "../database/db.js";

export async function findAllRentals() {
  return connection.query(`
    SELECT
      rentals.*,
      customers.name AS "customerName",
      games.name AS "gameName"
    FROM rentals
    JOIN customers ON rentals."customerId" = customers.id
    JOIN games ON rentals."gameId" = games.id
  `);
}

export async function insertRental({
  customerId,
  gameId,
  rentDate,
  daysRented,
  returnDate,
  originalPrice,
  delayFee,
}) {
  return connection.query(
    `
    INSERT INTO rentals
      ("customerId", "gameId", "rentDate", "daysRented", "returnDate", "originalPrice", "delayFee")
    VALUES
      ($1, $2, $3, $4, $5, $6, $7)
  `,
    [
      customerId,
      gameId,
      rentDate,
      daysRented,
      returnDate,
      originalPrice,
      delayFee,
    ]
  );
}

export async function countOpenRentalsByGameId(gameId) {
  return connection.query(
    `
    SELECT COUNT(*) FROM rentals
    WHERE "gameId" = $1 AND "returnDate" IS NULL
  `,
    [gameId]
  );
}

export async function findRentalById(rentalId) {
  return connection.query(
    `
    SELECT * FROM rentals WHERE id = $1
  `,
    [rentalId]
  );
}

export async function updateRentalReturn(rentalId, returnDate, delayFee) {
  return connection.query(
    `
    UPDATE rentals
    SET "returnDate" = $1, "delayFee" = $2
    WHERE id = $3
  `,
    [returnDate, delayFee, rentalId]
  );
}

export async function deleteRental(rentalId) {
  return connection.query(
    `
    DELETE FROM rentals WHERE id = $1
  `,
    [rentalId]
  );
}
