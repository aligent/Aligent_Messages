<?php

class Aligent_Messages_Model_MessageEventHandlers_WishlistAddSuccess implements Aligent_Messages_Model_MessageEventHandlers_MessageEventHandlerInterface {

    const EVENT = 'wishlist.add';

    public function parse($aMessages)
    {
        $aEvents = array();

        foreach ($aMessages as $oMessage) {
            if ($oMessage->class === 'Mage_Wishlist_IndexController' && $oMessage->type === 'success' && $oMessage->method === '_addItemToWishList') {
                $aEvents[] = self::EVENT;
            }
        }

        return array_unique($aEvents);
    }

}