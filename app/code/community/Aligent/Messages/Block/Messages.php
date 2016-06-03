<?php

class Aligent_Messages_Block_Messages extends Mage_Core_Block_Template {

    public function isEnabled() {
        if (!$this->getData('enabled')) {
            $this->setData('enabled', Mage::getStoreConfig(Aligent_Messages_Model_Messages::CONFIG_MESSAGES_COOKIE_ENABLED));
        }
        return $this->getData('enabled');
    }

    public function getCookieName() {
        if (!$this->getData('cookieName')) {
            $sCookieName = Mage::getStoreConfig(Aligent_Messages_Model_Messages::CONFIG_MESSAGES_COOKIE_NAME);

            if (!$sCookieName) {
                $sCookieName = 'mage_msgs';
            }

            $this->setData('cookieName', $sCookieName);
        }
        return $this->getData('cookieName');
    }

}