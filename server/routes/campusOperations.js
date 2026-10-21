const express = require('express');
const router = express.Router();
const campusCtrl = require('../controllers/campusOperations.controller');
const { authenticate, authorize } = require('../middleware/auth');

// 1. Hostel Management
router.get('/hostel/rooms', authenticate, campusCtrl.getHostelRooms);
router.post('/hostel/rooms', authenticate, authorize(['SUPER_ADMIN', 'PRINCIPAL']), campusCtrl.createHostelRoom);
router.get('/hostel/allocations', authenticate, campusCtrl.getHostelAllocations);
router.post('/hostel/allocate', authenticate, authorize(['SUPER_ADMIN', 'PRINCIPAL']), campusCtrl.allocateHostelBed);
router.put('/hostel/vacate/:allocationId', authenticate, authorize(['SUPER_ADMIN', 'PRINCIPAL']), campusCtrl.vacateHostelBed);

// 2. Transport Routes
router.get('/transport/routes', authenticate, campusCtrl.getTransportRoutes);
router.post('/transport/routes', authenticate, authorize(['SUPER_ADMIN', 'PRINCIPAL']), campusCtrl.createTransportRoute);
router.get('/transport/allocations', authenticate, campusCtrl.getTransportAllocations);
router.post('/transport/allocate', authenticate, authorize(['SUPER_ADMIN', 'PRINCIPAL']), campusCtrl.allocateTransport);

// 3. Equipment & Lab Inventory
router.get('/equipment', authenticate, campusCtrl.getEquipment);
router.post('/equipment', authenticate, authorize(['SUPER_ADMIN', 'PRINCIPAL', 'HOD', 'FACULTY']), campusCtrl.createEquipment);
router.put('/equipment/:id/condition', authenticate, authorize(['SUPER_ADMIN', 'PRINCIPAL', 'HOD', 'FACULTY']), campusCtrl.updateEquipmentCondition);

// 4. Facilities Maintenance Requests
router.get('/maintenance', authenticate, campusCtrl.getMaintenanceRequests);
router.post('/maintenance', authenticate, campusCtrl.createMaintenanceRequest);
router.put('/maintenance/:id/status', authenticate, authorize(['SUPER_ADMIN', 'PRINCIPAL']), campusCtrl.updateMaintenanceStatus);

module.exports = router;
