<?php

namespace App\Models;

/**
 * Alias de nomenclature française pour StockMovement.
 */
class MouvementStock extends StockMovement
{
    protected $table = 'stock_movements';
}
