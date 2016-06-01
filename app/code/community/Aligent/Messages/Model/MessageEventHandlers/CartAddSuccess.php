<?php

class Aligent_Messages_Model_MessageEventHandlers_CartAddSuccess implements Aligent_Messages_Model_MessageEventHandlers_MessageEventHandlerInterface {

    const EVENT = 'cart.add';

    public function parse($aMessages)
    {
        $aEvents = array();

        foreach ($aMessages as $oMessage) {
            if ($oMessage->class === 'Mage_Checkout_CartController' && $oMessage->type === 'success' && $oMessage->method === 'addAction') {
                $aEvents[] = self::EVENT;
            }
        }

        return array_unique($aEvents);
    }

}