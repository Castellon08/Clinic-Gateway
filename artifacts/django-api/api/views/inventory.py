from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from ..models import Inventory


def _item_dict(item):
    qty = float(item.quantity)
    min_qty = float(item.min_quantity)
    return {
        "id": item.id,
        "name": item.name,
        "category": item.category,
        "unit": item.unit,
        "quantity": qty,
        "minQuantity": min_qty,
        "unitCost": float(item.unit_cost) if item.unit_cost is not None else None,
        "supplier": item.supplier,
        "notes": item.notes,
        "createdAt": item.created_at,
        "updatedAt": item.updated_at,
        "isLowStock": qty <= min_qty,
    }


def _deny_dentist(request):
    if request.user.role == "dentist":
        return Response({"error": "Forbidden", "message": "Dentists cannot access inventory"}, status=status.HTTP_403_FORBIDDEN)
    return None


class InventoryListView(APIView):
    def get(self, request):
        denied = _deny_dentist(request)
        if denied:
            return denied
        qs = Inventory.objects.all()
        if request.query_params.get("search"):
            qs = qs.filter(name__icontains=request.query_params["search"])
        if request.query_params.get("lowStock") == "true":
            from django.db.models import F, ExpressionWrapper, FloatField, Cast
            from django.db.models.functions import Cast as DjCast
            items = [i for i in qs if float(i.quantity) <= float(i.min_quantity)]
            return Response([_item_dict(i) for i in items])
        return Response([_item_dict(i) for i in qs.order_by("name")])

    def post(self, request):
        denied = _deny_dentist(request)
        if denied:
            return denied
        data = request.data
        name = data.get("name")
        unit = data.get("unit")
        if not name or not unit:
            return Response({"error": "name and unit are required"}, status=status.HTTP_400_BAD_REQUEST)
        item = Inventory.objects.create(
            name=name,
            category=data.get("category"),
            unit=unit,
            quantity=data.get("quantity", 0),
            min_quantity=data.get("minQuantity", data.get("min_quantity", 0)),
            unit_cost=data.get("unitCost") or data.get("unit_cost"),
            supplier=data.get("supplier"),
            notes=data.get("notes"),
        )
        return Response(_item_dict(item), status=status.HTTP_201_CREATED)


class InventoryDetailView(APIView):
    def _get(self, pk):
        try:
            return Inventory.objects.get(pk=pk)
        except Inventory.DoesNotExist:
            return None

    def get(self, request, pk):
        denied = _deny_dentist(request)
        if denied:
            return denied
        item = self._get(pk)
        if not item:
            return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(_item_dict(item))

    def put(self, request, pk):
        denied = _deny_dentist(request)
        if denied:
            return denied
        item = self._get(pk)
        if not item:
            return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        data = request.data
        field_map = {
            "minQuantity": "min_quantity",
            "unitCost": "unit_cost",
        }
        for json_key, model_field in field_map.items():
            if json_key in data:
                setattr(item, model_field, data[json_key])
        for field in ["name", "category", "unit", "quantity", "supplier", "notes"]:
            if field in data:
                setattr(item, field, data[field])
        item.save()
        return Response(_item_dict(item))

    def delete(self, request, pk):
        denied = _deny_dentist(request)
        if denied:
            return denied
        item = self._get(pk)
        if not item:
            return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        item.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class InventoryAdjustView(APIView):
    def post(self, request, pk):
        denied = _deny_dentist(request)
        if denied:
            return denied
        adj_type = request.data.get("type")
        quantity = request.data.get("quantity")
        if not adj_type or not quantity:
            return Response({"error": "type and quantity are required"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            item = Inventory.objects.get(pk=pk)
        except Inventory.DoesNotExist:
            return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        current = float(item.quantity)
        delta = float(quantity) if adj_type == "in" else -float(quantity)
        item.quantity = max(0, current + delta)
        item.save()
        return Response(_item_dict(item))
