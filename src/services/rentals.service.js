import dayjs from "dayjs";
import { db } from "../database/db.js";

import NotFoundError from "../errors/NotFoundError.js";
import ConflictError from "../errors/ConflictError.js";
import BadRequestError from "../errors/BadRequestError.js";

export async function getAllRentals() {
  const result = await db.query(`
    SELECT rentals.*, 
           customers.id AS "customerId", customers.name AS "customerName",
           games.id AS "gameId", games.name AS "gameName"
      FROM rentals
      JOIN customers ON rentals."customerId" = customers.id
      JOIN games ON rentals."gameId" = games.id;
  `);

  return result.rows.map(rental => ({
    id: rental.id,
    customerId: rental.customerId,
    gameId: rental.gameId,
    rentDate: dayjs(rental.rentDate).format('YYYY-MM-DD'),
    daysRented: rental.daysRented,
    returnDate: rental.returnDate ? dayjs(rental.returnDate).format('YYYY-MM-DD') : null,
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
  if (!customerId || !gameId || daysRented <= 0) {
    throw new BadRequestError("Campos inválidos");
  }

  const customerResult = await db.query(`SELECT * FROM customers WHERE id = $1`, [customerId]);
  if (customerResult.rowCount === 0) throw new NotFoundError("Cliente não encontrado");

  const gameResult = await db.query(`SELECT * FROM games WHERE id = $1`, [gameId]);
  if (gameResult.rowCount === 0) throw new NotFoundError("Jogo não encontrado");

  const game = gameResult.rows[0];

  const rentalsResult = await db.query(`
    SELECT * FROM rentals WHERE "gameId" = $1 AND "returnDate" IS NULL
  `, [gameId]);

  if (rentalsResult.rowCount >= game.stockTotal) {
    throw new ConflictError("Estoque insuficiente");
  }

  const rentDate = dayjs().format("YYYY-MM-DD");
  const originalPrice = daysRented * game.pricePerDay;

  await db.query(`
    INSERT INTO rentals ("customerId", "gameId", "rentDate", "daysRented", "returnDate", "originalPrice", "delayFee")
    VALUES ($1, $2, $3, $4, null, $5, null)
  `, [customerId, gameId, rentDate, daysRented, originalPrice]);
}

export async function returnRental(id) {
  const result = await db.query(`SELECT * FROM rentals WHERE id = $1`, [id]);
  if (result.rowCount === 0) throw new NotFoundError("Aluguel não encontrado");

  const rental = result.rows[0];
  if (rental.returnDate) throw new ConflictError("Aluguel já devolvido");

  const returnDate = dayjs();
  const rentDate = dayjs(rental.rentDate);
  const diffDays = returnDate.diff(rentDate, "day");

  const delayDays = diffDays - rental.daysRented;
  const delayFee = delayDays > 0 ? delayDays * rental.originalPrice / rental.daysRented : 0;

  await db.query(`
    UPDATE rentals 
    SET "returnDate" = $1, "delayFee" = $2 
    WHERE id = $3
  `, [returnDate.format("YYYY-MM-DD"), delayFee, id]);
}

export async function deleteRental(id) {
  const result = await db.query(`SELECT * FROM rentals WHERE id = $1`, [id]);
  if (result.rowCount === 0) throw new NotFoundError("Aluguel não encontrado");

  const rental = result.rows[0];
  if (!rental.returnDate) throw new BadRequestError("Aluguel ainda não devolvido");

  await db.query(`DELETE FROM rentals WHERE id = $1`, [id]);
}
