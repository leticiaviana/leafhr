import { Catch, ArgumentsHost } from '@nestjs/common';
import { GqlExceptionFilter, GqlArgumentsHost } from '@nestjs/graphql';
import { GraphQLError } from 'graphql';
import { BaseError } from '../exceptions/base.error';

@Catch(BaseError)
export class GraphQLExceptionFilter implements GqlExceptionFilter {
  catch(exception: BaseError, _host: ArgumentsHost) {
    GqlArgumentsHost.create(_host);

    return new GraphQLError(exception.message, {
      extensions: {
        code: exception.code,
        httpStatus: exception.httpStatus,
        details: exception.details,
      },
    });
  }
}
