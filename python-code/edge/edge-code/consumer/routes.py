import asyncio
import logging

from .service.camera_service import CameraService
from .service.device_service import DeviceService
from lib.lib_app.livekit_message_publish import publish_device_status

logger = logging.getLogger(__name__)

async def route_backend_request(payload: dict, app_context: dict):
    service = payload.get('service')
    method = payload.get('method')
    data = payload.get('data', {})

    # logger.info(f"received data: {data}")

    if service == 'CAMERA':
        if method == 'create':
            await CameraService.create(data, app_context)
            return
        elif method == 'patch':
            await CameraService.patch(data, app_context)
            return
        elif method == 'delete':
            await CameraService.delete(data, app_context)
            return
        else:
            logger.warning(f"Method {method} not recognized for service CAMERA")
            return
    
    elif service == 'DEVICE':
        if method == 'status-request':
            logger.info(f"receiving frontend request device status")
            asyncio.create_task(
                publish_device_status(
                    room=app_context['room'],
                    device_id=app_context["config"]['device_id'],
                    frontend_request=True
                )
            )
            return
        elif method == 'ai-shutdown':
            await DeviceService.ai_shutdown(data, app_context)
            return
        elif method == 'ai-activate':
            await DeviceService.ai_activate(data, app_context)
            return
        else:
            logger.warning(f"Method {method} not recognized for service DEVICE")
            return
    
    else:
        logger.warning(f"Service {service} not recognized")
        return