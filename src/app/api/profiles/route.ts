// ============================================================
// PayGuard — Profiles API Route
// CRUD for employee profiles with configurable thresholds
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import {
  createProfile,
  updateProfile,
  getAllProfiles,
  deleteProfile,
} from '@/server/services/db/service';
import { CONVENTIONS_COLLECTIVES } from '@/server/services/rules/conventions';

export async function GET() {
  try {
    const profiles = await getAllProfiles();
    const conventions = CONVENTIONS_COLLECTIVES.map(c => ({
      code: c.code,
      shortName: c.shortName,
      idcc: c.idcc,
    }));

    return NextResponse.json({ profiles, conventions });
  } catch (error) {
    console.error('Profiles GET error:', error);
    return NextResponse.json({ error: 'Erreur lors de la récupération des profils.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, isFullTime, isCadre, weeklyHours, collectiveAgreement, contractType,
      bonusVariationMax, hoursVariationMax, netGrossRatioMin, netGrossRatioMax, salaryVariationMax } = body;

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Nom du profil requis.' }, { status: 400 });
    }

    const profile = await createProfile({
      name: name.trim(),
      isFullTime: isFullTime ?? true,
      isCadre: isCadre ?? false,
      weeklyHours: weeklyHours ?? 35,
      collectiveAgreement,
      contractType: contractType ?? 'CDI',
      bonusVariationMax: bonusVariationMax ?? 20,
      hoursVariationMax: hoursVariationMax ?? 10,
      netGrossRatioMin: netGrossRatioMin ?? 0.6,
      netGrossRatioMax: netGrossRatioMax ?? 0.85,
      salaryVariationMax: salaryVariationMax ?? 15,
    });

    return NextResponse.json({ profile }, { status: 201 });
  } catch (error) {
    console.error('Profile CREATE error:', error);
    return NextResponse.json({ error: 'Erreur lors de la création du profil.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID du profil requis.' }, { status: 400 });
    }

    const profile = await updateProfile(id, data);
    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Profile UPDATE error:', error);
    return NextResponse.json({ error: 'Erreur lors de la mise à jour.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID du profil requis.' }, { status: 400 });
    }

    await deleteProfile(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Profile DELETE error:', error);
    return NextResponse.json({ error: 'Erreur lors de la suppression.' }, { status: 500 });
  }
}
