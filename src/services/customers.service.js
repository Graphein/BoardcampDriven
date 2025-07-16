import db from "../database/db.js";
import BadRequestError from "../errors/BadRequestError.js";
import NotFoundError from "../errors/NotFoundError.js";

export async function getCustomers() {
  const result = await db.query("SELECT * FROM customers");
  return result.rows;
}

export async function getCustomerById(id) {
  if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
    throw new BadRequestError("ID inválido");
  }

  const result = await db.query("SELECT * FROM customers WHERE id = $1", [id]);

  if (result.rows.length === 0) {
    throw new NotFoundError("Cliente não encontrado");
  }

  return result.rows[0];
}

export async function createCustomer({ name, phone, cpf }) {
  const cpfExists = await db.query("SELECT * FROM customers WHERE cpf = $1", [cpf]);
  if (cpfExists.rows.length > 0) {
    throw new BadRequestError("CPF já cadastrado");
  }

  await db.query(
    `INSERT INTO customers (name, phone, cpf) VALUES ($1, $2, $3)`,
    [name, phone, cpf]
  );
}

export async function updateCustomer(id, { name, phone, cpf }) {
  const customerId = Number(id);
  if (isNaN(customerId)) {
    throw new BadRequestError("ID inválido");
  }

  const existingCustomer = await db.query("SELECT * FROM customers WHERE id = $1", [customerId]);
  if (existingCustomer.rows.length === 0) {
    throw new NotFoundError("Cliente não encontrado");
  }

  const cpfConflict = await db.query("SELECT * FROM customers WHERE cpf = $1 AND id != $2", [cpf, customerId]);
  if (cpfConflict.rows.length > 0) {
    throw new BadRequestError("CPF já cadastrado em outro cliente");
  }

  await db.query(
    `UPDATE customers SET name = $1, phone = $2, cpf = $3 WHERE id = $4`,
    [name, phone, cpf, customerId]
  );
}
