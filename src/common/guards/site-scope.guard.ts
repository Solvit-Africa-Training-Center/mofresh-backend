import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';

@Injectable()
export class SiteScopeGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const requestedSiteId = request.params.siteId || request.body.siteId || request.query.siteId;

    if (user?.role === UserRole.SUPER_ADMIN) {
      return true;
    }

    if (!user?.siteId) {
      throw new ForbiddenException('User is not associated with any site');
    }

    if (requestedSiteId && requestedSiteId !== user.siteId) {
      throw new ForbiddenException('Access denied: Cannot access data from other sites');
    }

    return true;
  }
}
