import db from "../database/db.js";
import dayjs from "dayjs";
import BadRequestError from "../errors/BadRequestError.js";
import NotFoundError from "../errors/NotFoundError.js";
import UnprocessableEntityError from "../errors/UnprocessableEntityError.js";

export async function getRentals() {
  const result = await db.query(`
    SELECT rentals.*, 
           customers.id AS "customerId", customers.name AS "customerName",
           games.id AS "gameId", games.name AS "gameName"
    FROM rentals
    JOIN customers ON rentals."customerId" = customers.id
    JOIN games ON rentals."gameId" = games.id
  `);

  return result.rows.map(rental => ({
    id: rental.id,
    customerId: rental.customerId,
    gameId: rental.gameId,
    rentDate: rental.rentDate,
    daysRented: rental.daysRented,
    returnDate: rental.returnDate,
    originalPrice: rental.originalPrice,
    delayFee: rental.delayFee,
    customer: {
      id: rental.customerId,
      name: rental.customerName
    },
    game: {
      id: rental.gameId,
      name: rental.gameName
    }
  }));
}

export async function createRental({ customerId, gameId, daysRented }) {
  const customer = Number(customerId);
  const game = Number(gameId);

  if (isNaN(customer) || isNaN(game) || daysRented <= 0) {
    throw new BadRequestError("Dados inválidos");
  }

  const customerResult = await db.query("SELECT * FROM customers WHERE id = $1", [customer]);
  if (customerResult.rowCount === 0) {
    throw new NotFoundError("Cliente não encontrado");
  }

  const gameResult = await db.query("SELECT * FROM games WHERE id = $1", [game]);
  if (gameResult.rowCount === 0) {
    throw new NotFoundError("Jogo não encontrado");
  }

  const rentalCount = await db.query(
    `SELECT COUNT(*) FROM rentals WHERE "gameId" = $1 AND "returnDate" IS NULL`,
    [game]
  );

  const gamesRented = Number(rentalCount.rows[0].count);
  const stockTotal = gameResult.rows[0].stockTotal;
  if (gamesRented >= stockTotal) {
    throw new UnprocessableEntityError("Estoque esgotado");
  }

  const rentDate = dayjs().format("YYYY-MM-DD");
  const originalPrice = daysRented * gameResult.rows[0].pricePerDay;

  await db.query(`
    INSERT INTO rentals 
    ("customerId", "gameId", "rentDate", "daysRented", "returnDate", "originalPrice", "delayFee") 
    VALUES ($1, $2, $3, $4, null, $5, null)
  `, [customer, game, rentDate, daysRented, originalPrice]);
}

export async function returnRental(rentalId) {
  const id = Number(rentalId);
  if (isNaN(id)) {
    throw new BadRequestError("ID de aluguel inválido");
  }

  const rentalResult = await db.query("SELECT * FROM rentals WHERE id = $1", [id]);
  const rental = rentalResult.rows[0];

  if (!rental) {
    throw new NotFoundError("Aluguel não encontrado");
  }

  if (rental.returnDate !== null) {
    throw new UnprocessableEntityError("Aluguel já finalizado");
  }

  const returnDate = dayjs();
  const rentDate = dayjs(rental.rentDate);
  const daysDiff = returnDate.diff(rentDate, "day");
  const delay = daysDiff - rental.daysRented;
  const delayFee = delay > 0 ? delay * rental.originalPrice / rental.daysRented : 0;

  await db.query(`
    UPDATE rentals 
    SET "returnDate" = $1, "delayFee" = $2 
    WHERE id = $3
  `, [returnDate.format("YYYY-MM-DD"), delayFee, id]);
}

export async function deleteRental(rentalId) {
  const id = Number(rentalId);
  if (isNaN(id)) {
    throw new BadRequestError("ID de aluguel inválido");
  }

  const rentalResult = await db.query("SELECT * FROM rentals WHERE id = $1", [id]);
  const rental = rentalResult.rows[0];

  if (!rental) {
    throw new NotFoundError("Aluguel não encontrado");
  }

  if (rental.returnDate === null) {
    throw new BadRequestError("Não é possível excluir aluguel não finalizado");
  }

  await db.query("DELETE FROM rentals WHERE id = $1", [id]);
}
