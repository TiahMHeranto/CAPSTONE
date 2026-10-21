from app.services.remboursement import appliquer


def test_taux_franchise_et_plafond():
    assert appliquer(19000, 80, 0, 0, None) == (15200, 3800)
    assert appliquer(100000, 80, 10000, 0, 50000) == (50000, 50000)
    assert appliquer(100000, 0.8, 0, 20000, None) == (64000, 36000)


def test_le_plafond_negatif_ne_prend_rien():
    assert appliquer(10000, 80, 0, 0, 0) == (0, 10000)
