<?php

namespace App\Models;

/**
 * Alias de nomenclature française pour OrderItem.
 */
class LigneCommande extends OrderItem
{
    protected $table = 'order_items';
}
