import logging
from .service.camera_service import CameraService

logger = logging.getLogger(__name__)

async def route_backend_request(payload: dict, app_context: dict):
    service = payload.get('service')
    method = payload.get('method')
    data = payload.get('data', {})

    if service == 'CAMERA':
        if method == 'patch':
            await CameraService.patch(data, app_context)
            return
        elif method == 'delete':
            await CameraService.delete(data, app_context)
            return
        else:
            logger.warning(f"Method {method} not recognized for service CAMERA")
            return
    
    elif service == 'DEVICE':
        return
    
    else:
        logger.warning(f"Service {service} not recognized")
        return
