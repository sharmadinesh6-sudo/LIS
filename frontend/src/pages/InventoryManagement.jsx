import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { createInventoryItem, getInventory, getInventoryAlerts } from '@/lib/api';
import { toast } from 'sonner';
import { Plus, AlertTriangle, Clock } from 'lucide-react';

export default function InventoryManagement() {
  const [inventory, setInventory] = useState([]);
  const [alerts, setAlerts] = useState({ low_stock: [], expiring_soon: [] });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    item_name: '',
    item_type: 'reagent',
    lot_number: '',
    quantity: '',
    unit: '',
    expiry_date: '',
    minimum_stock: '',
    supplier: ''
  });

  useEffect(() => {
    fetchInventory();
    fetchAlerts();
  }, []);

  const fetchInventory = async () => {
    try {
      const response = await getInventory();
      setInventory(response.data);
    } catch (error) {
      console.error('Failed to fetch inventory:', error);
    }
  };

  const fetchAlerts = async () => {
    try {
      const response = await getInventoryAlerts();
      setAlerts(response.data);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createInventoryItem({
        ...formData,
        quantity: parseInt(formData.quantity),
        minimum_stock: parseInt(formData.minimum_stock),
        expiry_date: new Date(formData.expiry_date).toISOString()
      });
      toast.success('Inventory item added successfully!');
      setDialogOpen(false);
      setFormData({
        item_name: '',
        item_type: 'reagent',
        lot_number: '',
        quantity: '',
        unit: '',
        expiry_date: '',
        minimum_stock: '',
        supplier: ''
      });
      fetchInventory();
      fetchAlerts();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sidebar>
      <div data-testid="inventory-page">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
              Inventory Management
            </h1>
            <p className="text-slate-600 mt-2">Reagents & consumables tracking</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="add-inventory-button" className="bg-slate-900 hover:bg-slate-800">
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add Inventory Item</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="item_name">Item Name *</Label>
                    <Input
                      id="item_name"
                      value={formData.item_name}
                      onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                      required
                      data-testid="inventory-name-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="item_type">Type *</Label>
                    <Select
                      value={formData.item_type}
                      onValueChange={(value) => setFormData({ ...formData, item_type: value })}
                    >
                      <SelectTrigger data-testid="inventory-type-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="reagent">Reagent</SelectItem>
                        <SelectItem value="consumable">Consumable</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="lot_number">Lot Number *</Label>
                    <Input
                      id="lot_number"
                      value={formData.lot_number}
                      onChange={(e) => setFormData({ ...formData, lot_number: e.target.value })}
                      required
                      data-testid="inventory-lot-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="supplier">Supplier *</Label>
                    <Input
                      id="supplier"
                      value={formData.supplier}
                      onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                      required
                      data-testid="inventory-supplier-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="quantity">Quantity *</Label>
                    <Input
                      id="quantity"
                      type="number"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      required
                      data-testid="inventory-quantity-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="unit">Unit *</Label>
                    <Input
                      id="unit"
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      required
                      placeholder="e.g., mL, units"
                      data-testid="inventory-unit-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="minimum_stock">Minimum Stock *</Label>
                    <Input
                      id="minimum_stock"
                      type="number"
                      value={formData.minimum_stock}
                      onChange={(e) => setFormData({ ...formData, minimum_stock: e.target.value })}
                      required
                      data-testid="inventory-min-stock-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="expiry_date">Expiry Date *</Label>
                    <Input
                      id="expiry_date"
                      type="date"
                      value={formData.expiry_date}
                      onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                      required
                      data-testid="inventory-expiry-input"
                    />
                  </div>
                </div>
                <Button type="submit" disabled={loading} className="w-full" data-testid="inventory-submit-button">
                  {loading ? 'Adding...' : 'Add Item'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Alerts */}
        {(alerts.low_stock.length > 0 || alerts.expiring_soon.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {alerts.low_stock.length > 0 && (
              <Card className="border-red-200 bg-red-50">
                <CardHeader>
                  <CardTitle className="text-red-900 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Low Stock Alert
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {alerts.low_stock.map((item) => (
                      <div key={item.id} className="text-sm text-red-800">
                        <span className="font-semibold">{item.item_name}</span> - {item.quantity} {item.unit} remaining
                        (Min: {item.minimum_stock})
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {alerts.expiring_soon.length > 0 && (
              <Card className="border-amber-200 bg-amber-50">
                <CardHeader>
                  <CardTitle className="text-amber-900 flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Expiring Soon
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {alerts.expiring_soon.map((item) => (
                      <div key={item.id} className="text-sm text-amber-800">
                        <span className="font-semibold">{item.item_name}</span> - Expires in {item.days_to_expire} days
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>Inventory Items</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Lot Number</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Min Stock</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-slate-500 py-8">
                      No inventory items found
                    </TableCell>
                  </TableRow>
                ) : (
                  inventory.map((item) => {
                    const isLowStock = item.quantity <= item.minimum_stock;
                    const daysToExpire = Math.floor(
                      (new Date(item.expiry_date) - new Date()) / (1000 * 60 * 60 * 24)
                    );
                    const isExpiringSoon = daysToExpire <= 30 && daysToExpire >= 0;

                    return (
                      <TableRow key={item.id} data-testid={`inventory-row-${item.id}`}>
                        <TableCell className="font-medium">{item.item_name}</TableCell>
                        <TableCell>
                          <Badge className="bg-slate-100 text-slate-800 capitalize">{item.item_type}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{item.lot_number}</TableCell>
                        <TableCell className="tabular-nums">
                          <span className={isLowStock ? 'text-red-600 font-semibold' : ''}>
                            {item.quantity} {item.unit}
                          </span>
                        </TableCell>
                        <TableCell className="tabular-nums text-slate-600">
                          {item.minimum_stock} {item.unit}
                        </TableCell>
                        <TableCell className={isExpiringSoon ? 'text-amber-600 font-semibold' : ''}>
                          {new Date(item.expiry_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">{item.supplier}</TableCell>
                        <TableCell>
                          {isLowStock && (
                            <Badge className="bg-red-100 text-red-800">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Low Stock
                            </Badge>
                          )}
                          {isExpiringSoon && (
                            <Badge className="bg-amber-100 text-amber-800">
                              <Clock className="h-3 w-3 mr-1" />
                              Expiring
                            </Badge>
                          )}
                          {!isLowStock && !isExpiringSoon && (
                            <Badge className="bg-green-100 text-green-800">OK</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </Sidebar>
  );
}