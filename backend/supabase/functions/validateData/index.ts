import * as z from "zod";

Deno.serve(async (req) => {

  const inputData = await req.json();

  const numberArraySchema = z.array(
    z.preprocess(val => typeof val === "string" && !isNaN(Number(val)) ? Number(val) : val, z.number())
  );

  const dateArraySchema = z.array(
    z.preprocess(val => typeof val === "string" && !isNaN(Date.parse(val)) ? new Date(val) : val, z.instanceof(Date))
  );
  const stringArraySchema = z.array(z.string());

  // inferColumnSchema is a schema that infers the type of the column based on the values in the array
  const inferColumnSchema = z.preprocess((arr) => {
    if (!Array.isArray(arr)) throw new Error("Expected array");

    if (arr.every(v => typeof v === "number" || (typeof v === "string" && !isNaN(Number(v))))) {
      return numberArraySchema.parse(arr);
    }

    if (arr.every(v => typeof v === "string" && !isNaN(Date.parse(v)))) {
      return dateArraySchema.parse(arr);
    }

    if (arr.every(v => typeof v === "string")) {
      return stringArraySchema.parse(arr);
    }

    throw new Error("Mixed or unsupported types in array");
  }, z.union([numberArraySchema, dateArraySchema, stringArraySchema]));

  // dataSchema is a schema that validates the data based on the inferred column schema
  const dataSchema = z.record(z.string(), inferColumnSchema).refine(obj => {
    const lengths = Object.values(obj).map(col => col.length);
    return new Set(lengths).size === 1;
  }, { message: "All columns must have the same length" });

  const validatedData = dataSchema.parse(inputData);

  const getSchema = (data) =>
    Object.entries(data).map(([colName, values]) => {
      let type;
      if (values.every(v => typeof v === "number")) type = "number";
      else if (values.every(v => v instanceof Date)) type = "date";
      else type = "string";
      return { column: colName, type };
    });


  const outputResponse = { "data": validatedData, "schema": getSchema(validatedData) };

  return new Response(JSON.stringify(outputResponse), {
    headers: { "Content-Type": "application/json" },
  });
});
