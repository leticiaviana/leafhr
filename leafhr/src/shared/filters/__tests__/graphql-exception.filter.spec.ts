import { GraphQLExceptionFilter } from '../graphql-exception.filter';
import { BaseError } from '../../exceptions/base.error';
import { GraphQLError } from 'graphql';

describe('GraphQLExceptionFilter', () => {
  let filter: GraphQLExceptionFilter;

  beforeEach(() => {
    filter = new GraphQLExceptionFilter();
  });

  it('should convert BaseError to GraphQLError with extensions', () => {
    const error = new BaseError('Something failed', 'SOME_CODE', 422, {
      field: 'value',
    });

    const host = {
      getType: () => 'graphql',
      getArgs: () => [],
      getArgByIndex: () => ({}),
      switchToHttp: () => ({} as any),
      switchToRpc: () => ({} as any),
      switchToWs: () => ({} as any),
    } as any;

    const result = filter.catch(error, host);

    expect(result).toBeInstanceOf(GraphQLError);
    expect(result.message).toBe('Something failed');
    expect(result.extensions).toEqual({
      code: 'SOME_CODE',
      httpStatus: 422,
      details: { field: 'value' },
    });
  });
});
