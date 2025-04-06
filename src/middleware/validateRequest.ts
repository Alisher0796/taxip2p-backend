import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, z } from 'zod';

type ValidateSchema = {
  body?: AnyZodObject;
  query?: AnyZodObject;
  params?: AnyZodObject;
};

export const validateRequest = (schemas: ValidateSchema) => 
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }
      if (schemas.query) {
        req.query = await schemas.query.parseAsync(req.query);
      }
      if (schemas.params) {
        req.params = await schemas.params.parseAsync(req.params);
      }
      return next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: 'Validation failed',
          errors: error.errors
        });
      }
      return res.status(500).json({ message: 'Internal server error' });
    }
  };
