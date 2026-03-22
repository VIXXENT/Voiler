/**
 * Params for the update operation.
 */
export type UpdateParams<T> = {
  id: number;
  data: Partial<T>;
};

/**
 * Generic repository interface definition.
 * Follows GemTest Constitution: single parameter objects and independent types.
 */
export type IRepository<T, CreateInput> = {
  /**
   * Creates a new entity.
   * @param data - The data to create the entity.
   * @returns A promise that resolves to the created entity.
   */
  create: (data: CreateInput) => Promise<T>;

  /**
   * Retrieves all entities.
   * @returns A promise that resolves to an array of entities.
   */
  findAll: () => Promise<T[]>;

  /**
   * Finds an entity by its identifier.
   * @param id - The unique identifier of the entity.
   * @returns A promise that resolves to the entity or null if not found.
   */
  findById: (id: number) => Promise<T | null>;

  /**
   * Updates an existing entity.
   * @param params - The update parameters including id and data.
   * @returns A promise that resolves to the updated entity.
   */
  update: (params: UpdateParams<T>) => Promise<T>;

  /**
   * Deletes an entity by its identifier.
   * @param id - The unique identifier of the entity.
   * @returns A promise that resolves to true if deleted, false otherwise.
   */
  delete: (id: number) => Promise<boolean>;
};
